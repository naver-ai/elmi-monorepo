import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom"
import { SignInPage } from "../features/auth/pages/SignInPage"
import { ProjectsPage } from "../features/projects/pages/ProjectsPage"
import { SigningEditorPage } from "../features/signing/pages/SigningEditorPage"
import { useVerifyToken } from "../features/auth/hooks"
import { useEffect } from "react"
import { useSelector } from "../redux/hooks"
import { UserInfoPage } from "../features/auth/pages/UserInfoPage"
import { useVerifyAdminToken } from "../features/admin/auth/hook"
import { AdminLoginPage } from "../features/admin/auth/pages/AdminLoginPage"
import { UserListPage } from "../features/admin/users/pages/UserListPage"
import { UsersPageFrame } from "../features/admin/users/components/UsersPageFrame"
import { UserPage } from "../features/admin/users/pages/UserPage"
import { UserProjectDetailPage } from "../features/admin/users/pages/UserProjectDetailPage"


const AdminLoggedInRoute = () => {
    const { verify, isSignedIn } = useVerifyAdminToken();
  
    useEffect(() => {
      verify().then((isSignedIn) => {
        if (!isSignedIn) {
          console.log('Should redirect to login');
        }
      });
    }, [verify]);
  
    if (isSignedIn) {
      return <Outlet />;
    } else if (isSignedIn == null) {
      return <div>Verifying user...</div>;
    } else {
      return <Navigate to="/admin/login" />;
    }
  };

const SignedInRoute = () => {
    const {verify, isSignedIn} = useVerifyToken()

    useEffect(()=>{
        verify().then(isSignedIn => {
            if(!isSignedIn){
                console.log("Should redirect to login")
            }
        })
    }, [verify])

    if(isSignedIn){
        return <Outlet/>
    }else if(isSignedIn == null){
        return <div>Verifying user...</div>
    }else{
        return <Navigate to="/app/login"/>
    }
}

const UserInfoCompleteCheckRouteFrame = () => {
    const user = useSelector(state => state.auth.user)
    if(user?.callable_name == null || user?.sign_language == null){
        return <Navigate to="/app/userinfo"/>
    }else return <Outlet/>
}

export const MainRouter = () => {
    return <BrowserRouter basename="/">
    <Routes>
        <Route index element={<Navigate to={"app"} />} />
        <Route path="app">
            <Route path="login" element={<SignInPage />} />
            <Route element={<SignedInRoute/>}>
                <Route path="userinfo" element={<UserInfoPage/>}/>
                <Route element={<UserInfoCompleteCheckRouteFrame/>}>
                    <Route index element={<Navigate to="projects"/>}/>
                    <Route path="projects">
                        <Route index element={<ProjectsPage />} />
                        <Route path=":id" element={<SigningEditorPage />} />
                    </Route>
                </Route>
            </Route>
        </Route>
        <Route path="admin">
            <Route path="login" element={<AdminLoginPage/>}/>
            <Route element={<AdminLoggedInRoute/>}>
                <Route index element={<Navigate to={'users'} />} />
                    <Route element={<UsersPageFrame/>}>
                        <Route path="users">
                        <Route index element={<UserListPage/>} />
                        <Route path=":userId" element={<UserPage/>}/>
                        <Route path=":userId/projects/:projectId" element={<UserProjectDetailPage/>}/>
                    </Route>
                </Route>
            </Route>
        </Route>
    </Routes>
</BrowserRouter>
}