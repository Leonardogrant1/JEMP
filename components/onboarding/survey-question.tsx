import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
    question: string;
    subtext?: string;
    options: string[];
    value: string | null;
    onChange: (value: string) => void;
};

const ITEM_WIDTH = 500;
const SHINE_WIDTH = 80;

function OptionItem({
    option,
    selected,
    onPress,
    delay,
}: {
    option: string;
    selected: boolean;
    onPress: () => void;
    delay: number;
}) {
    const scale = useRef(new Animated.Value(1)).current;
    const shineX = useRef(new Animated.Value(-SHINE_WIDTH)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(16)).current;

    useEffect(() => {
        const t = setTimeout(() => {
            Animated.parallel([
                Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
                Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 5 }),
            ]).start();
        }, delay);
        return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function triggerShine() {
        shineX.setValue(-SHINE_WIDTH);
        Animated.timing(shineX, {
            toValue: ITEM_WIDTH,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }

    function handlePressIn() {
        triggerShine();
        Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
    }

    function handlePressOut() {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start();
    }

    return (
        <Animated.View style={{ opacity, transform: [{ translateY }] }}>
            <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
                <Animated.View
                    style={[
                        styles.option,
                        selected && styles.optionSelected,
                        { transform: [{ scale }] },
                    ]}
                >
                    <Animated.View
                        style={[styles.shineWrapper, { transform: [{ translateX: shineX }] }]}
                        pointerEvents="none"
                    >
                        <LinearGradient
                            colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.shine}
                        />
                    </Animated.View>

                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                        {option}
                    </Text>
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                        {selected && <View style={styles.radioDot} />}
                    </View>
                </Animated.View>
            </Pressable>
        </Animated.View>
    );
}

export function SurveyQuestion({ question, subtext, options, value, onChange }: Props) {
    const questionOpacity = useRef(new Animated.Value(0)).current;
    const questionY = useRef(new Animated.Value(16)).current;
    const subtextOpacity = useRef(new Animated.Value(0)).current;
    const subtextY = useRef(new Animated.Value(16)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(questionOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.spring(questionY, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 5 }),
        ]).start();

        const t = setTimeout(() => {
            Animated.parallel([
                Animated.timing(subtextOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.spring(subtextY, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 5 }),
            ]).start();
        }, 150);
        return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Animated.Text style={[styles.question, { opacity: questionOpacity, transform: [{ translateY: questionY }] }]}>
                    {question}
                </Animated.Text>
                {subtext && (
                    <Animated.Text style={[styles.subtext, { opacity: subtextOpacity, transform: [{ translateY: subtextY }] }]}>
                        {subtext}
                    </Animated.Text>
                )}
            </View>

            <View style={styles.options}>
                {options.map((option, i) => (
                    <OptionItem
                        key={option}
                        option={option}
                        selected={value === option}
                        onPress={() => onChange(option)}
                        delay={300 + i * 100}
                    />
                ))}
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
        marginBottom: 40,
    },
    question: {
        color: 'white',
        fontSize: 28,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 10,
    },
    subtext: {
        color: 'rgba(255,255,255,0.45)',
        fontSize: 14,
        textAlign: 'center',
    },
    options: {
        gap: 10,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1c1c1c',
        borderRadius: 12,
        paddingHorizontal: 18,
        paddingVertical: 18,
        borderWidth: 1,
        borderColor: 'transparent',
        overflow: 'hidden',
    },
    optionSelected: {
        borderColor: 'white',
    },
    shineWrapper: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: SHINE_WIDTH,
    },
    shine: {
        flex: 1,
        width: SHINE_WIDTH,
    },
    optionText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 16,
    },
    optionTextSelected: {
        color: 'white',
    },
    radio: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioSelected: {
        borderColor: 'white',
    },
    radioDot: {
        width: 11,
        height: 11,
        borderRadius: 6,
        backgroundColor: 'white',
    },
});
