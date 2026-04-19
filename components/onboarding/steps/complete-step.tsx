import { StyleSheet, Text, View } from 'react-native';

export function CompleteStep() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Bereit?</Text>
            <Text style={styles.subtitle}>Drück auf den Button um loszulegen.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        gap: 12,
    },
    title: {
        color: 'white',
        fontSize: 32,
        fontWeight: '700',
        textAlign: 'center',
    },
    subtitle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 16,
        textAlign: 'center',
    },
});
