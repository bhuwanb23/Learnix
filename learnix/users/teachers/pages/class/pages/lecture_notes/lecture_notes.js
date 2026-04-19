import React from 'react';
import UnitList from './unit_list/unit_list';

export default function LectureNotes({ route, navigation }) {
    const classData = route?.params?.classData;

    return <UnitList route={route} navigation={navigation} />;
}