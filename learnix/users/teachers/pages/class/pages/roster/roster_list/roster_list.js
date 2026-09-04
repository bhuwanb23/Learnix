import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RosterHeader from './components/RosterHeader';
import RosterOverview from './components/RosterOverview';
import SearchBar from './components/SearchBar';
import FilterChips from './components/FilterChips';
import StudentCard from './components/StudentCard';
import RosterActions from './components/RosterActions';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import StudentDetail from '../student_detail/student_detail';
import MarkAttendance from '../mark_attendance/mark_attendance';
import AttendanceReport from '../attendance_report/attendance_report';
import AddStudent from '../add_student/add_student';
import { ROSTER_HEADER, ROSTER_OVERVIEW, FILTERS, STUDENTS } from './constants/rosterData';


export default function RosterList({ route, navigation }) {
    const classData = route?.params?.classData || {
        id: 'PSY-402',
        code: 'PSY-402',
        title: 'Advanced Cognitive Psychology',
    };

    const header = {
        title: ROSTER_HEADER.title,
        code: classData.code || ROSTER_HEADER.code,
        courseName: classData.title || ROSTER_HEADER.courseName,
    };

    const [query, setQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [sort, setSort] = useState('name');
    const [currentScreen, setCurrentScreen] = useState('list');
    const [selectedStudent, setSelectedStudent] = useState(null);

    const handleBack = () => {
        if (currentScreen !== 'list') {
            setCurrentScreen('list');
            setSelectedStudent(null);
        } else if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleOpenStudent = (student) => {
        setSelectedStudent(student);
        setCurrentScreen('StudentDetail');
    };

    const handleMarkAttendance = () => {
        setCurrentScreen('MarkAttendance');
    };

    const handleReport = () => {
        setCurrentScreen('AttendanceReport');
    };

    const handleAddStudent = () => {
        setCurrentScreen('AddStudent');
    };

    const handleSaveAttendance = () => {
        setCurrentScreen('list');
    };

    const handleAddStudentDone = () => {
        setCurrentScreen('list');
    };

    const visibleStudents = STUDENTS.filter((student) => {
        const matchesQuery =
            query.length === 0 ||
            student.name.toLowerCase().includes(query.toLowerCase()) ||
            student.studentId.toLowerCase().includes(query.toLowerCase());

        let matchesFilter = true;
        if (activeFilter === 'present') {
            matchesFilter = student.status === 'present';
        } else if (activeFilter === 'absent') {
            matchesFilter = student.status === 'absent' || student.status === 'late';
        } else if (activeFilter === 'at_risk') {
            matchesFilter = student.risk || student.attendance < 75;
        }
        return matchesQuery && matchesFilter;
    });

    const sortedStudents = [...visibleStudents].sort((a, b) =>
        sort === 'name' ? a.name.localeCompare(b.name) : b.attendance - a.attendance
    );

    const subNavigation = {
        goBack: handleBack,
        navigate: (screen, params) => {
            if (screen === 'StudentDetail') {
                handleOpenStudent(params?.student);
            } else if (screen === 'MarkAttendance') {
                handleMarkAttendance();
            } else if (screen === 'AttendanceReport') {
                handleReport();
            } else if (screen === 'AddStudent') {
                handleAddStudent();
            }
        },
    };

    if (currentScreen === 'StudentDetail') {
        return (
            <StudentDetail
                route={{ params: { student: selectedStudent, classData } }}
                navigation={subNavigation}
            />
        );
    }

    if (currentScreen === 'MarkAttendance') {
        return (
            <MarkAttendance
                route={{ params: { classData } }}
                navigation={{ ...subNavigation, goBack: handleSaveAttendance }}
            />
        );
    }

    if (currentScreen === 'AttendanceReport') {
        return (
            <AttendanceReport
                route={{ params: { classData } }}
                navigation={subNavigation}
            />
        );
    }

    if (currentScreen === 'AddStudent') {
        return (
            <AddStudent
                route={{ params: { classData } }}
                navigation={{ ...subNavigation, goBack: handleAddStudentDone }}
            />
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <RosterHeader header={header} onBack={handleBack} />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <RosterOverview overview={ROSTER_OVERVIEW} />
                <View style={styles.listSection}>
                    <SearchBar
                        query={query}
                        onChangeQuery={setQuery}
                        sort={sort}
                        onToggleSort={() => setSort(sort === 'name' ? 'attendance' : 'name')}
                    />
                    <FilterChips
                        filters={FILTERS}
                        activeFilter={activeFilter}
                        onChange={setActiveFilter}
                    />
                    {sortedStudents.length === 0 ? (
                        <View style={styles.emptyState}>
                            <MaterialIcons name="person-search" size={44} color="#c3c7cc" />
                            <Text style={styles.emptyTitle}>No students found</Text>
                            <Text style={styles.emptyText}>
                                Try a different name, ID, or filter.
                            </Text>
                        </View>
                    ) : (
                        sortedStudents.map((student) => (
                            <StudentCard
                                key={student.studentId}
                                student={student}
                                onPress={() => handleOpenStudent(student)}
                            />
                        ))
                    )}
                </View>
            </ScrollView>
            <RosterActions
                onMarkAttendance={handleMarkAttendance}
                onReport={handleReport}
                onAddStudent={handleAddStudent}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7f9',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 24,
    },
    listSection: {
        marginTop: 20,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 48,
        paddingHorizontal: 32,
    },
    emptyTitle: {
        marginTop: 12,
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 16,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 4,
    },
    emptyText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 12,
        color: '#8a8f94',
        textAlign: 'center',
    },
});