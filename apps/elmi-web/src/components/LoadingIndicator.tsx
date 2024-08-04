import { Spin } from "antd"

export const LoadingIndicator = (props: {
    title: string
}) => {
    return <div className="flex items-center p-6 gap-2"><Spin/><span>{props.title}</span></div>
}