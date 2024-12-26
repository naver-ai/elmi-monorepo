import { useVerifyToken } from "../features/auth/hooks"
import { useEffect, lazy, Suspense } from "react"
import { useSelector } from "../redux/hooks"
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom"
import { useVerifyAdminToken } from "../features/admin/auth/hook"
import { LoadingIndicator } from "../components/LoadingIndicator"

const SignInPage = lazy(()=>import("../features/auth/pages/SignInPage"))
const ProjectsPage = lazy(()=>import("../features/projects/pages/ProjectsPage"))
const SigningEditorPage = lazy(()=>import("../features/signing/pages/SigningEditorPage"))
const UserInfoPage = lazy(()=>import("../features/auth/pages/UserInfoPage"))

const AdminLoginPage = lazy(()=>import("../features/admin/auth/pages/AdminLoginPage"))
const UserListPage = lazy(()=>import("../features/admin/users/pages/UserListPage"))
const UsersPageFrame = lazy(()=>import("../features/admin/users/components/UsersPageFrame"))
const UserPage = lazy(()=>import("../features/admin/users/pages/UserPage"))
const UserProjectDetailPage = lazy(()=>import("../features/admin/users/pages/UserProjectDetailPage"))


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
      return <div className="flex justify-center items-center h-[100vh] w-full"><LoadingIndicator title="Verifying user..."/></div>;
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
        return <div className="flex justify-center items-center h-[100vh] w-full"><LoadingIndicator title="Verifying user..."/></div>
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
        <Suspense fallback={<div>Loading...</div>}>
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
        </Suspense>
    </BrowserRouter>
}