import type { ComponentPropsWithoutRef, JSX } from "react";
type SkeletonProps = ComponentPropsWithoutRef<"div">;
export declare function Skeleton({ className, ...props }: SkeletonProps): JSX.Element;
export declare function TableSkeleton(props: SkeletonProps): JSX.Element;
export declare function CardSkeleton(props: SkeletonProps): JSX.Element;
export {};
