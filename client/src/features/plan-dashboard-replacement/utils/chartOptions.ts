export function getChartTheme(theme: 'dark' | 'light'): any {
  const isDark = theme === 'dark';
  return {
    chart: {
      background: 'transparent',
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      foreColor: isDark ? '#cbd5e1' : '#475569',
      toolbar: { show: false },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800,
        dynamicAnimation: { enabled: true, speed: 350 },
      },
    },
    theme: { mode: theme },
    grid: {
      borderColor: isDark ? '#2a2a2a' : '#e5e7eb',
      strokeDashArray: 3,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { top: 0, right: 0, bottom: 0, left: 4 },
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth' as const, width: 2.5 },
    xaxis: {
      labels: { style: { colors: isDark ? '#cbd5e1' : '#64748b', fontSize: '13px', fontFamily: '"Plus Jakarta Sans"' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { colors: isDark ? '#cbd5e1' : '#64748b', fontSize: '13px', fontFamily: '"Plus Jakarta Sans"' } },
    },
    tooltip: { theme: theme },
    colors: ['#ff5a1f', '#45a29e', '#3b82f6', '#eab308', '#ef4444'],
    legend: {
      labels: { colors: isDark ? '#e2e8f0' : '#475569' },
      fontSize: '13px',
      fontFamily: '"Plus Jakarta Sans"',
    },
  };
}

// Keep backward compat
export const chartTheme = getChartTheme('dark');
export const darkChartOptions = getChartTheme('dark');
