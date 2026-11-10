import React from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { report } from "../services/clientErrors";

type Props = { children: React.ReactNode };
type State = { error: Error | null };

/**
 * The last thing between a render error and a blank screen.
 *
 * There was no boundary anywhere in this app: a throw inside any of the 24
 * screens killed the whole tree, and the user saw nothing but white — with no
 * report, because nothing was watching. Catching it here does two things that
 * matter more than the message shown: it records what happened, and it leaves
 * the person a way out that isn't force-quitting.
 *
 * Deliberately styled without the theme hooks. A boundary that depends on the
 * providers it is meant to protect will itself throw when they are what broke.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    report({
      kind: "render_error",
      message: String(error?.message ?? error).slice(0, 300),
      stacktrace: `${error?.stack ?? ""}\n\nComponent stack:${info?.componentStack ?? ""}`.slice(0, 4000),
    });
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          Doyo ran into an unexpected problem. It has been reported. You can try again
          from here.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => this.setState({ error: null })}>
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: "#1d1d1d" },
  title: { color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 10, textAlign: "center" },
  body: { color: "#a7a8ac", fontSize: 14, lineHeight: 21, textAlign: "center", marginBottom: 24 },
  button: { backgroundColor: "#00baf0", paddingVertical: 13, paddingHorizontal: 30, borderRadius: 14 },
  buttonText: { color: "#00222c", fontWeight: "800", fontSize: 14 },
});
