// Event memories — photo uploads into the shared File store.
// Docs: 12-alumni-relations.md §3.3 · §4
//
// A reunion is worth little if the photographs disappear with the event page, so
// these are real uploads into Domain L rather than pasted URLs: a dead image
// host cannot break a page years later.
//
// The upload handling itself lives in `eventUpload.ts`, which mirrors
// `modules/accounts/expenses.routes.ts` — same multer setup, same random
// filenames, same "write the File row first" ordering. Keeping the two identical
// matters more than it looks: the filename rule (never trust the client's) is a
// path-traversal defence, and it should exist once, not twice by hand.

import { prisma } from '../../db/prisma.js';
import { forbidden, notFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import type { Viewer } from './directory.service.js';

export async function listPhotos(eventId: string, institutionId: string) {
  const event = await prisma.event.findFirst({ where: { id: eventId, institutionId }, select: { id: true } });
  if (!event) throw notFound('Event not found');

  const photos = await prisma.eventPhoto.findMany({
    where: { eventId },
    orderBy: { createdAt: 'asc' },
    include: {
      file: { select: { storageKey: true, mimeType: true, sizeBytes: true, originalName: true } },
      uploader: { select: { fullName: true } },
    },
  });

  return {
    count: photos.length,
    photos: photos.map((p) => ({
      id: p.id,
      caption: p.caption,
      // Static path, served from UPLOAD_DIR. In production this would be a signed
      // object-storage URL rather than a public one.
      url: `/uploads/${p.file.storageKey}`,
      mimeType: p.file.mimeType,
      sizeBytes: p.file.sizeBytes,
      originalName: p.file.originalName,
      uploadedBy: p.uploader?.fullName ?? null,
      createdAt: p.createdAt,
    })),
  };
}

/**
 * Attach an already-uploaded file to an event.
 *
 * The File row is created by the route BEFORE this is called, so a failure here
 * leaves an orphan file in the store — invisible and harmless — rather than an
 * EventPhoto pointing at a file that was never written.
 */
export async function addPhoto(
  viewer: Viewer,
  eventId: string,
  body: { fileId: string; caption?: string },
) {
  if (!viewer.isOffice) throw forbidden('Only the Alumni Relations Office can add event photos');

  const event = await prisma.event.findFirst({
    where: { id: eventId, institutionId: viewer.institutionId },
    select: { id: true, title: true },
  });
  if (!event) throw notFound('Event not found');

  const file = await prisma.file.findFirst({
    where: { id: body.fileId, institutionId: viewer.institutionId },
    select: { id: true, storageKey: true, mimeType: true },
  });
  if (!file) throw notFound('Uploaded file not found');
  if (!file.mimeType.startsWith('image/')) throw forbidden('Event memories must be images');

  const existing = await prisma.eventPhoto.findFirst({ where: { eventId, fileId: file.id } });
  if (existing) throw forbidden('That photo is already attached to this event');

  const photo = await prisma.eventPhoto.create({
    data: {
      eventId,
      fileId: file.id,
      caption: body.caption?.trim() || null,
      uploadedByUserId: viewer.userId,
    },
  });

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'event.photo.add',
    entityType: 'Event',
    entityId: eventId,
    after: { photoId: photo.id, event: event.title, caption: photo.caption },
  });

  return {
    id: photo.id,
    caption: photo.caption,
    url: `/uploads/${file.storageKey}`,
    mimeType: file.mimeType,
  };
}

/**
 * Remove a photo from the event AND delete its File row.
 *
 * Both, because the two tables cascade in one direction only: deleting the
 * EventPhoto would leave an orphaned File nobody can reach, and deleting the
 * File alone would take the photo with it via onDelete: Cascade. Doing both in a
 * transaction keeps the store from growing a tail of unreferenced images.
 */
export async function deletePhoto(viewer: Viewer, eventId: string, photoId: string) {
  if (!viewer.isOffice) throw forbidden('Only the Alumni Relations Office can remove event photos');

  const photo = await prisma.eventPhoto.findFirst({
    where: { id: photoId, event: { id: eventId, institutionId: viewer.institutionId } },
    select: { id: true, fileId: true },
  });
  if (!photo) throw notFound('Photo not found');

  await prisma.$transaction([
    prisma.eventPhoto.delete({ where: { id: photo.id } }),
    prisma.file.deleteMany({ where: { id: photo.fileId } }),
  ]);

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'event.photo.delete',
    entityType: 'Event',
    entityId: eventId,
    after: { photoId: photo.id },
  });

  const remaining = await prisma.eventPhoto.count({ where: { eventId } });
  return { photoId: photo.id, deleted: true, remaining };
}

export async function updateCaption(viewer: Viewer, eventId: string, photoId: string, caption: string) {
  if (!viewer.isOffice) throw forbidden('Only the Alumni Relations Office can edit captions');
  const photo = await prisma.eventPhoto.findFirst({
    where: { id: photoId, event: { id: eventId, institutionId: viewer.institutionId } },
    select: { id: true },
  });
  if (!photo) throw notFound('Photo not found');
  const updated = await prisma.eventPhoto.update({
    where: { id: photo.id },
    data: { caption: caption.trim() || null },
  });
  return { id: updated.id, caption: updated.caption };
}