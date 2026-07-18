import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import RecordItem from '../components/RecordItem';
import { getRecords, removeRecord } from '../lib/storage';
import { HangRecord } from '../lib/types';

export default function RecordsScreen() {
  const [records, setRecords] = useState<HangRecord[]>([]);

  useEffect(() => {
    getRecords().then(setRecords);
  }, []);

  const handleDelete = async (id: string) => {
    const next = await removeRecord(id);
    setRecords(next);
  };

  const bestId =
    records.length > 0
      ? records.reduce((best, r) => (r.durationMs > best.durationMs ? r : best)).id
      : null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>기록</Text>
      {records.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>아직 기록이 없습니다.{'\n'}타이머로 첫 측정을 해보세요.</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <RecordItem record={item} isBest={item.id === bestId} onDelete={handleDelete} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111',
    marginVertical: 16,
  },
  list: {
    gap: 8,
    paddingBottom: 24,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});
