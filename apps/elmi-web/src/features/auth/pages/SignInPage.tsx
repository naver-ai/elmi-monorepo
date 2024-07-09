import { useForm } from "react-hook-form"
import * as yup from 'yup'
import {yupResolver} from "@hookform/resolvers/yup"
import { Button, Card, Form, Input } from "antd"
import { FormItem } from "react-hook-form-antd"

const schema = yup.object({
    passcode: yup.string().trim().min(1).matches(/[0-9]+/, "Passcode must contain only numbers.").required()
})

export const SignInPage = () => {

    const {control, handleSubmit} = useForm({
        resolver: yupResolver(schema)
    })

    return <div className="container mx-auto justify-center items-center flex h-[100vh] overflow-auto">
        <Card rootClassName="justify-center min-w-[30%]" title={<span>Sign In to ELMI</span>} bordered={false}>
            
            <Form onFinish={handleSubmit((values) => {})} className="w-full flex gap-2">
                <FormItem control={control} name="passcode" rootClassName="m-0 flex-1">
                    <Input.Password placeholder="Insert passcode"/>
                </FormItem>
                <Button rootClassName="self-stretch" htmlType="submit" type="primary">Enter</Button>
            </Form>
        </Card>
    </div>
}