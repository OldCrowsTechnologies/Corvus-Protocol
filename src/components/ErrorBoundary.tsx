import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

interface State {
  error: Error | null;
  info: string;
}

/**
 * Catches any render/runtime error in the tree and shows it ON SCREEN, so a
 * device-only failure is visible (and reportable) instead of a blank/loading app.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null, info: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    this.setState({ error, info: info?.componentStack ?? '' });
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.root}>
          <Text style={styles.title}>CORVUS PROTOCOL — startup error</Text>
          <ScrollView style={styles.scroll}>
            <Text style={styles.msg}>{String(this.state.error?.message || this.state.error)}</Text>
            {this.state.error?.stack ? <Text style={styles.stack}>{this.state.error.stack}</Text> : null}
            {this.state.info ? <Text style={styles.stack}>{this.state.info}</Text> : null}
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0E12', padding: 20, paddingTop: 60 },
  title: { color: '#00C2C7', fontSize: 15, fontWeight: '700', marginBottom: 12 },
  scroll: { flex: 1 },
  msg: { color: '#e08a8a', fontSize: 13, marginBottom: 12 },
  stack: { color: '#8a97a8', fontSize: 10, lineHeight: 15 },
});
