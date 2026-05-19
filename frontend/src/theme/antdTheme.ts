import type { ThemeConfig } from 'antd';
import type { ThemeTokens } from './tokens';
import { darkTheme, lightTheme } from './tokens';

const FONT_FAMILY = "'Inter', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif";

export function createAntdTheme(tokens: ThemeTokens): ThemeConfig {
  return {
    token: {
      colorPrimary: tokens.colorPrimary,
      colorBgBase: tokens.colorBgBase,
      colorBgContainer: tokens.colorBgContainer,
      colorBgElevated: tokens.colorBgElevated,
      colorBorder: tokens.colorBorder,
      colorText: tokens.colorText,
      colorTextSecondary: tokens.colorTextSecondary,
      colorSuccess: tokens.colorSuccess,
      colorWarning: tokens.colorWarning,
      colorError: tokens.colorError,
      colorBgLayout: tokens.colorBgBase,
      borderRadius: 8,
      fontFamily: FONT_FAMILY,
    },
    algorithm: undefined,
    components: {
      Layout: {
        headerBg: 'transparent',
        bodyBg: tokens.colorBgBase,
        footerBg: 'transparent',
      },
      Menu: {
        darkItemBg: 'transparent',
        darkItemSelectedBg: 'rgba(124, 58, 237, 0.15)',
        darkItemHoverBg: 'rgba(124, 58, 237, 0.1)',
      },
      Button: {
        primaryShadow: 'none',
      },
      Card: {
        colorBgContainer: tokens.colorBgContainer,
      },
    },
  };
}

export const antdDarkTheme: ThemeConfig = createAntdTheme(darkTheme);
export const antdLightTheme: ThemeConfig = createAntdTheme(lightTheme);
