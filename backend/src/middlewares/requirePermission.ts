import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { forbidden } from '../lib/errors.js';

/**
 * Capability check: does this caller hold one named permission?
 *
 * WHY THIS EXISTS
 * ---------------
 * The platform already had the whole shape of this and never used it. `PermissionGroup` and
 * `RolePermission` (`a3_rbac.prisma`) are modelled, the seed grants keys per role
 * (`rolePermissionMap`), `POST /platform/roles/:role/permissions` lets an admin change them live,
 * every change is audited in `platform.service.ts`, and `profile.service.ts` hands the app the
 * caller's own permission list so the UI can grey things out.
 *
 * But nothing ever CHECKED one. The seeded `HOSTEL: ['fees.read']` grant was decorative: the
 * warden could see "you may read fees" on their profile and still get a 403 from `/accounts/*`,
 * because every module gates on `requireRole('ACCOUNTS','ADMIN')` and nothing looked at
 * `fees.read` at all. A permission system that is displayed, administered and audited but never
 * enforced is worse than no permission system, because it looks like a control that is not there.
 *
 * So this middleware is the missing enforcement point, and it is deliberately the ONLY thing
 * added here. It is applied to the hostel mess surface, which is where a real capability had to
 * cross a module boundary: a `HOSTEL` warden needs to see and raise MESS expenses, but granting
 * the `ACCOUNTS` role to reach them would also hand over payroll, fee waivers and scholarships.
 *
 * The honest scope note: retrofitting the other twenty modules onto this is separate work. Until
 * then permissions are enforced HERE and nowhere else, so this file must never be read as
 * "permissions are enforced across the platform".
 *
 * WHY ADMIN AND PLATFORM_ADMIN BYPASS
 * -----------------------------------
 * The seed grants `ADMIN` literally every key (`permissionGroups.map(g => g.key)`), so the
 * bypass is belt-and-braces for the day an admin loses a grant. `PLATFORM_ADMIN` exists to
 * administer the permission table itself and cannot be edited from the UI it edits, so it would
 * otherwise be able to lock itself out.
 *
 * WHY THE LOOKUP IS PER-REQUEST AND NOT CACHED
 * ---------------------------------------------
 * A grant changed mid-session has to take effect on the next request, not the next restart.
 * `RolePermission` is indexed on `role` and holds a handful of rows, so the cost is one small
 * indexed query per guarded request. Caching it correctly (invalidate on the audited write) is a
 * real optimisation and also a real source of "I changed the role and nothing happened" bugs,
 * so it is left out until there is a measured reason.
 */
export function requirePermission(...keys: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) return next(forbidden('No auth context'));

    const roles = req.auth.roles;
    // `ADMIN` holds every key by seed construction; `PLATFORM_ADMIN` administers the table.
    if (roles.includes('ADMIN') || roles.includes('PLATFORM_ADMIN')) return next();

    if (keys.length === 0) return next();

    void (async () => {
      try {
        const held = await prisma.rolePermission.findMany({
          where: { role: { in: roles as string[] }, permissionKey: { in: keys } },
          select: { permissionKey: true },
        });
        // ANY of the listed keys is enough. Callers pass alternatives where more than one role or
        // key could legitimately authorise the action; `requireRole` takes an OR list and this
        // keeps the two gates interchangeable at the call site.
        if (held.length > 0) return next();

        next(forbidden(`Requires permission: ${keys.join(' or ')}`));
      } catch (err) {
        // A guard that fails open is not a guard. Any lookup problem is a 403, never a pass.
        next(forbidden('Could not verify permissions'));
      }
    })();
  };
}