import { ConfigProvider, ThemeConfig, theme as AntdTheme } from "antd";

export const theme: ThemeConfig = {
    token: {
        colorPrimary: "#303030",
        fontSize: 14,
        fontFamily: "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol','Noto Color Emoji'"
    },
    components: {
        Input: {
            colorPrimary: '#ff583e',
            algorithm: true
        },
        Layout: {
            colorBgLayout: 'transparent',
            siderBg: 'white'      
        },
        Divider: {
            orientationMargin: 0,
            textPaddingInline: 0
        },
    }
}

export const PartialDarkThemeProvider = (props: {children: any}) => {
    return <ConfigProvider theme={{
        algorithm: AntdTheme.darkAlgorithm,
        token: {
            colorPrimary: 'white'
        },
        components: {
            Progress: {
                defaultColor: "white",
                remainingColor: 'rgba(255,255,255,0.45)'
            }
        }
    }}>
        {props.children}
    </ConfigProvider>
}