import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  SafeAreaView, ActivityIndicator, Alert, Linking, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { COLORS } from '../constants/theme';
import { getMonthlyReport } from '../services/api';

// How often to refetch the report while the screen stays visible. 5 s feels
// near-live during a demo while still being well within Firebase quotas.
const REFRESH_INTERVAL_MS = 5000;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const formatType = (type) =>
  type ? type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Other';

const trendLabel = (trend) => {
  if (!trend || trend.direction === 'flat') return '— (no change)';
  const arrow = trend.direction === 'improvement' ? '↓' : '↑';
  const word = trend.direction === 'improvement' ? 'improvement' : 'increase';
  return `${arrow} ${trend.percent}% (${word})`;
};

const buildReportHtml = (report) => {
  const rows = (report.categories || [])
    .map(
      (c) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #eee">${formatType(c.type)}</td><td style="padding:8px;text-align:right;border-bottom:1px solid #eee">${c.count}</td></tr>`,
    )
    .join('');

  const hotspot = report.topHotspot
    ? `${report.topHotspot.latitude.toFixed(4)}, ${report.topHotspot.longitude.toFixed(4)} (${report.topHotspot.count} reports)`
    : 'No hotspot data';

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Roboto, sans-serif; padding: 24px; color: #212121; }
          h1 { color: #1565C0; font-size: 22px; margin: 0 0 4px 0; }
          .period { color: #757575; margin-bottom: 24px; }
          .stats { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 24px; }
          .stat { flex: 1 1 45%; border: 1px solid #E0E0E0; border-radius: 10px; padding: 16px; text-align: center; }
          .stat .value { font-size: 28px; font-weight: 700; }
          .stat .label { font-size: 12px; color: #757575; margin-top: 4px; }
          h2 { font-size: 15px; color: #212121; margin: 16px 0 8px; }
          table { width: 100%; border-collapse: collapse; }
          .meta p { margin: 4px 0; }
          .meta strong { color: #1565C0; }
        </style>
      </head>
      <body>
        <h1>Monthly Safety Report</h1>
        <div class="period">Period: ${report.periodLabel}</div>

        <div class="stats">
          <div class="stat"><div class="value">${report.total}</div><div class="label">Total Reports</div></div>
          <div class="stat"><div class="value">${report.approved}</div><div class="label">Resolved</div></div>
          <div class="stat"><div class="value">${report.sosAlerts}</div><div class="label">SOS Alerts</div></div>
          <div class="stat"><div class="value">${report.resolutionRate}%</div><div class="label">Resolution Rate</div></div>
        </div>

        <h2>Reports by Category</h2>
        <table>${rows || '<tr><td>No incidents this period</td></tr>'}</table>

        <div class="meta" style="margin-top: 24px">
          <p><strong>Top Hotspot:</strong> ${hotspot}</p>
          <p><strong>Trend vs Last Month:</strong> ${trendLabel(report.trend)}</p>
        </div>
      </body>
    </html>
  `;
};

const MonthlyReportScreen = ({ navigation }) => {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Tracks the time of the most recent successful fetch so the user can see
  // the data is live, not stale.
  const [lastUpdated, setLastUpdated] = useState(null);
  // Avoid clobbering newer state with the result of a slow in-flight request
  // that started before the user changed month/year.
  const requestIdRef = useRef(0);

  const fetchReport = useCallback(async ({ silent = false } = {}) => {
    const requestId = ++requestIdRef.current;
    if (!silent) setLoading(true);
    try {
      const data = await getMonthlyReport({ month, year });
      if (requestId !== requestIdRef.current) return; // stale response
      setReport(data);
      setLastUpdated(new Date());
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      // Demo fallback so the UI always has something to show.
      setReport({
        monthLabel: `${MONTH_NAMES[month - 1]} ${year}`,
        periodLabel: `1 ${MONTH_NAMES[month - 1]} ${year} - ${new Date(year, month, 0).getDate()} ${MONTH_NAMES[month - 1]} ${year}`,
        total: 0,
        approved: 0,
        sosAlerts: 0,
        resolutionRate: 0,
        categories: [],
        topHotspot: null,
        trend: { percent: 0, direction: 'flat', previousTotal: 0 },
      });
    } finally {
      // Always clear the spinner on whichever request is the latest, even
      // if it ran silently — otherwise a silent fetch that supersedes a
      // non-silent one (e.g. focus+mount racing) leaves loading stuck true.
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [month, year]);

  // Initial fetch + refetch when the user navigates months.
  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Refresh whenever the screen regains focus (e.g. user submits a new
  // incident report and navigates back) and poll periodically while visible
  // so live numbers tick without manual intervention.
  useFocusEffect(
    useCallback(() => {
      fetchReport({ silent: true });
      const id = setInterval(() => fetchReport({ silent: true }), REFRESH_INTERVAL_MS);
      return () => clearInterval(id);
    }, [fetchReport]),
  );

  const onPullRefresh = async () => {
    setRefreshing(true);
    await fetchReport({ silent: true });
    setRefreshing(false);
  };

  const goPrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const goNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const exportPdf = async () => {
    if (!report) return;
    try {
      const { uri } = await Print.printToFileAsync({ html: buildReportHtml(report) });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share Monthly Report' });
      } else {
        Alert.alert('PDF Saved', `Report written to:\n${uri}`);
      }
    } catch (err) {
      Alert.alert('Export Failed', err.message || 'Unable to generate PDF.');
    }
  };

  const emailStakeholders = () => {
    if (!report) return;
    const subject = encodeURIComponent(`Campus Safety — Monthly Report (${report.monthLabel})`);
    const lines = [
      `Monthly Safety Report — ${report.periodLabel}`,
      '',
      `Total Reports: ${report.total}`,
      `Resolved: ${report.approved}`,
      `SOS Alerts: ${report.sosAlerts}`,
      `Resolution Rate: ${report.resolutionRate}%`,
      '',
      'Reports by Category:',
      ...(report.categories || []).map((c) => `  - ${formatType(c.type)}: ${c.count}`),
      '',
      `Trend vs Last Month: ${trendLabel(report.trend)}`,
    ];
    const body = encodeURIComponent(lines.join('\n'));
    Linking.openURL(`mailto:?subject=${subject}&body=${body}`).catch(() => {
      Alert.alert('Email Unavailable', 'No email client is configured on this device.');
    });
  };

  const maxCount = Math.max(1, ...(report?.categories || []).map((c) => c.count));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {navigation?.canGoBack?.() ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}
        <Text style={styles.headerTitle}>Monthly Safety Report</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.periodRow}>
        <TouchableOpacity onPress={goPrevMonth} style={styles.periodNav}>
          <Text style={styles.periodNavText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.periodLabel}>
          {MONTH_NAMES[month - 1]} {year}
        </Text>
        <TouchableOpacity onPress={goNextMonth} style={styles.periodNav}>
          <Text style={styles.periodNavText}>›</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onPullRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          <Text style={styles.periodSub}>Period: {report.periodLabel}</Text>
          <View style={styles.liveRow}>
            {lastUpdated && (
              <Text style={styles.lastUpdated}>
                Live · updated {lastUpdated.toLocaleTimeString()} (auto-refresh 5s)
              </Text>
            )}
            <TouchableOpacity
              onPress={() => fetchReport({ silent: true })}
              style={styles.refreshNowButton}
            >
              <Text style={styles.refreshNowText}>↻ Refresh now</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { borderTopColor: COLORS.primary }]}>
              <Text style={styles.statValue}>{report.total}</Text>
              <Text style={styles.statLabel}>Total Reports</Text>
            </View>
            <View style={[styles.statCard, { borderTopColor: COLORS.success }]}>
              <Text style={styles.statValue}>{report.approved}</Text>
              <Text style={styles.statLabel}>Resolved</Text>
            </View>
            <View style={[styles.statCard, { borderTopColor: COLORS.danger }]}>
              <Text style={styles.statValue}>{report.sosAlerts}</Text>
              <Text style={styles.statLabel}>SOS Alerts</Text>
            </View>
            <View style={[styles.statCard, { borderTopColor: COLORS.warning }]}>
              <Text style={styles.statValue}>{report.resolutionRate}%</Text>
              <Text style={styles.statLabel}>Resolution Rate</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Reports by Category</Text>
          {report.categories.length === 0 ? (
            <Text style={styles.emptyText}>No incidents reported this month.</Text>
          ) : (
            report.categories.map((c) => (
              <View key={c.type} style={styles.barRow}>
                <Text style={styles.barLabel}>{formatType(c.type)}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${(c.count / maxCount) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.barValue}>{c.count}</Text>
              </View>
            ))
          )}

          <View style={styles.metaCard}>
            <Text style={styles.metaRow}>
              <Text style={styles.metaLabel}>Top Hotspot: </Text>
              {report.topHotspot
                ? `${report.topHotspot.latitude.toFixed(4)}, ${report.topHotspot.longitude.toFixed(4)} (${report.topHotspot.count} reports)`
                : 'No hotspot data'}
            </Text>
            <Text style={styles.metaRow}>
              <Text style={styles.metaLabel}>Trend vs Last Month: </Text>
              {trendLabel(report.trend)}
            </Text>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={exportPdf}>
            <Text style={styles.primaryButtonText}>Export PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={emailStakeholders}>
            <Text style={styles.secondaryButtonText}>Email to Stakeholders</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primaryDark, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  backButton: { width: 60 },
  backText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  periodRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.white, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  periodNav: { paddingHorizontal: 20 },
  periodNavText: { fontSize: 26, color: COLORS.primary, fontWeight: '700' },
  periodLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text, minWidth: 160, textAlign: 'center' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  periodSub: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  liveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  lastUpdated: { fontSize: 11, color: COLORS.success, fontStyle: 'italic', flex: 1 },
  refreshNowButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  refreshNowText: { fontSize: 11, color: COLORS.primary, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: {
    width: '48%', backgroundColor: COLORS.white, borderRadius: 10,
    padding: 16, marginBottom: 10, alignItems: 'center',
    borderTopWidth: 3, elevation: 2,
  },
  statValue: { fontSize: 28, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 16, marginBottom: 12 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  barLabel: { width: 90, fontSize: 13, color: COLORS.text },
  barTrack: {
    flex: 1, height: 18, backgroundColor: COLORS.greyLight,
    borderRadius: 4, marginHorizontal: 8, overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  barValue: { width: 40, textAlign: 'right', fontSize: 13, fontWeight: '600', color: COLORS.text },
  emptyText: { fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic', marginBottom: 8 },
  metaCard: {
    backgroundColor: COLORS.white, borderRadius: 10,
    padding: 14, marginTop: 16, elevation: 1,
  },
  metaRow: { fontSize: 13, color: COLORS.text, marginVertical: 4 },
  metaLabel: { fontWeight: '700', color: COLORS.primary },
  primaryButton: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    padding: 16, alignItems: 'center', marginTop: 24,
  },
  primaryButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    backgroundColor: COLORS.white, borderRadius: 10,
    padding: 16, alignItems: 'center', marginTop: 10,
    borderWidth: 1.5, borderColor: COLORS.primary,
  },
  secondaryButtonText: { color: COLORS.primary, fontSize: 16, fontWeight: '700' },
});

export default MonthlyReportScreen;
