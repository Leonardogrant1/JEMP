import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Option = {
    label: string;
    emoji: string;
};

type Props = {
    question: string;
    subtext?: string;
    options: Option[];
    value: string[];
    onChange: (value: string[]) => void;
};

export function MultiPicker({ question, subtext, options, value, onChange }: Props) {
    function toggle(label: string) {
        if (value.includes(label)) {
            onChange(value.filter((v) => v !== label));
        } else {
            onChange([...value, label]);
        }
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.question}>{question}</Text>
                {subtext && <Text style={styles.subtext}>{subtext}</Text>}
            </View>

            <View style={styles.options}>
                {options.map((option) => {
                    const selected = value.includes(option.label);
                    return (
                        <TouchableOpacity
                            key={option.label}
                            style={[styles.option, selected && styles.optionSelected]}
                            onPress={() => toggle(option.label)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.indicator, selected && styles.indicatorSelected]}>
                                {selected ? '✓' : '+'}
                            </Text>
                            <Text style={styles.emoji}>{option.emoji}</Text>
                            <Text style={[styles.label, selected && styles.labelSelected]}>
                                {option.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 36,
    },
    question: {
        color: 'white',
        fontSize: 26,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 10,
        lineHeight: 34,
    },
    subtext: {
        color: 'rgba(255,255,255,0.45)',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    options: {
        gap: 4,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'transparent',
        gap: 12,
    },
    optionSelected: {
        borderColor: 'white',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    indicator: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 16,
        width: 16,
        textAlign: 'center',
    },
    indicatorSelected: {
        color: 'white',
    },
    emoji: {
        fontSize: 20,
    },
    label: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 16,
        flex: 1,
    },
    labelSelected: {
        color: 'white',
    },
});
