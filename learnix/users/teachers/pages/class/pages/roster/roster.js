import React from 'react';
import RosterList from './roster_list/roster_list';

export default function Roster({ route, navigation }) {
    return <RosterList route={route} navigation={navigation} />;
}