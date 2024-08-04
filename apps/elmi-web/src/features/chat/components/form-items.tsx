import { Input, type InputRef, InputProps } from "antd"
import { forwardRef } from "react"
import { Control, useController } from "react-hook-form"

export type HookFormProps = {
    control: Control<any>,
    name: string,
} & InputProps

export const HookFormInput = forwardRef<InputRef, HookFormProps>((props, ref) => {

    const {field, fieldState: {invalid, isTouched, isDirty}} = useController({name: props.name, control: props.control}) 

    return <Input ref={ref} {...props} onChange={field.onChange} onBlur={field.onBlur} value={field.value} name={field.name}/>
})