/**
 * 微信登录相关 DTO 和接口定义
 */

/**
 * 微信用户信息（从微信 API 获取）
 */
export interface WechatUserInfo {
  openid: string;
  nickname: string;
  headimgurl: string;
  sex: number;
  province: string;
  city: string;
  country: string;
  unionid?: string;
}

/**
 * 微信 Access Token 响应
 */
export interface WechatAccessTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  openid: string;
  scope: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

/**
 * 微信登录状态
 */
export type WechatLoginStatusType = 'pending' | 'scanned' | 'confirmed' | 'expired';

/**
 * 登录状态数据
 */
export interface WechatLoginState {
  status: WechatLoginStatusType;
  userInfo?: WechatUserInfo;
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    refreshExpiresIn: number;
  };
  user?: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string;
  };
  expiresAt: number;
  createdAt: number;
}

/**
 * 获取登录状态响应
 */
export interface WechatLoginStatusResponse {
  status: WechatLoginStatusType;
  user?: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string;
  };
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

/**
 * 二维码响应
 */
export interface WechatQrResponse {
  qrUrl: string;
  state: string;
  expiresIn: number; // 秒
}

/**
 * 确认登录响应
 */
export interface WechatConfirmResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string;
    emailVerified: boolean;
  };
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  message?: string;
}
