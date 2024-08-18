import { useCallback } from 'react';
import { Button, Card, Form, Input } from 'antd';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useDispatch, useSelector } from '../../../../redux/hooks';
import { FormItem } from 'react-hook-form-antd';
import { loginAdminThunk } from '../reducer';

const schema = yup
  .object({
    password: yup.string().trim().min(5).required(),
  })
  .required();

export const AdminLoginPage = () => {

  const { control, handleSubmit } = useForm<{ password: string }>({
    resolver: yupResolver(schema),
  });

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const signIn: SubmitHandler<{ password: string }> = useCallback(
    (values: { password: string }) => {
      dispatch(
        loginAdminThunk(values.password, () => {
          navigate('/admin/users');
        })
      );
    },
    []
  );

  return <div className="container mx-auto justify-center items-center flex h-[100vh] overflow-auto">
      <Card
        rootClassName="justify-center min-w-[30%]"
        title={<span>Admin Login</span>}
        bordered={false}
      >
        <Form onFinish={handleSubmit(signIn)} className="w-full flex gap-2">
          <FormItem
            control={control}
            name="password"
            rootClassName="m-0 flex-1"
          >
            <Input.Password placeholder={"Insert admin password"} autoFocus/>
          </FormItem>
          <Button rootClassName="self-stretch" htmlType="submit" type="primary">Enter</Button>
        </Form>
      </Card>
    </div>
};
