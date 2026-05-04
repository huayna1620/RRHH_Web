type DailyBar = {
    date: string;
    present: number;
    late: number;
    absent: number;
};
type AttendanceBarChartProps = {
    data: DailyBar[];
};
export declare function AttendanceBarChart({ data }: AttendanceBarChartProps): JSX.Element;
export {};
