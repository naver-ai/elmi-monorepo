import { Button, Card, Form, Input, Segmented, Select } from "antd"
import { SignedInScreenFrame } from "../../../components/SignedInScreenFrame"
import { FormItem } from "react-hook-form-antd"
import * as yup from 'yup'
import { SignLanguageType } from "../../../model-types"
import { yupResolver } from "@hookform/resolvers/yup"
import { useForm } from "react-hook-form"
import { useCallback, useEffect } from "react"
import { useSelector } from "../../../redux/hooks"
import { Navigate } from "react-router-dom"


const schema = yup.object({
    callable_name: yup.string().trim().min(1).required(),
    sign_language: yup.mixed<SignLanguageType>().oneOf(Object.values(SignLanguageType)).required()
})

export const UserInfoPage = () => {

    const {control, handleSubmit, setValue} = useForm({
        resolver: yupResolver(schema)
    })

    const submitInfo = useCallback((values: {callable_name: string, sign_language: SignLanguageType}) => {
        console.log(values)
    }, [])

    useEffect(()=>{
        setValue("sign_language", SignLanguageType.ASL, {shouldDirty: false})
    }, [])

    const user = useSelector(state => state.auth.user)
    if(user?.callable_name != null && user?.sign_language != null){
        return <Navigate to="/app"/>
    }else return <SignedInScreenFrame withHeader={true}>
        <div className="container mx-auto justify-center items-center flex h-full">
        <Card rootClassName="justify-center min-w-[30%]" title={<span>User Configuration</span>} bordered={false}>
            
            <Form onFinish={handleSubmit(submitInfo)} className="w-full">
                <FormItem control={control} name="callable_name" rootClassName="m-0 flex-1" label="Callable Name" labelAlign="left" labelCol={{span: 10}}>
                    <Input placeholder="Your callable name that ELMI will call you."/>
                </FormItem>
                <FormItem control={control} name="sign_language" rootClassName="m-0 flex-1" label="Preferred Sign Language" labelAlign="left" labelCol={{span: 10}}>
                    <Segmented options={Object.keys(SignLanguageType)}/>
                </FormItem>
                <div className="text-right border-t pt-4 mt-4">
                    <Button rootClassName="self-stretch" htmlType="submit" type="primary">Submit</Button>
                </div>
                
            </Form>
        </Card>
    </div>
    </SignedInScreenFrame>
}