import { AttendanceBarChart } from "@/components/charts/AttendanceBarChart";

type DailyBar = {
  date: string;
  present: number;
  late: number;
  absent: number;
};

type AttendanceBarChartProps = {
  data: DailyBar[];
};

export function GraficoAsistencia({ data }: AttendanceBarChartProps): JSX.Element {
  return <AttendanceBarChart data={data} />;
}
