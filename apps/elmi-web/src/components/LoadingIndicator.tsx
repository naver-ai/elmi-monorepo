import { Spin, Typography } from "antd"

export const LoadingIndicator = (props: {
    title: string,
    size?: "small" | "default"
}) => {
    return <div className={`flex items-center ${props.size == 'small' ? 'p-2 gap-0.5' : 'p-6 gap-2'}`}><Spin size={props.size || "default"}/><Typography.Text className={`${props.size == 'small' ? "text-sm" : "text-base"} animate-pulse`}>{props.title}</Typography.Text></div>
}