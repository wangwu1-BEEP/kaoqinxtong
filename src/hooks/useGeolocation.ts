'use client';

import { useState, useEffect, useCallback } from 'react';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;       // 精度(米)
  address?: string;       // 逆地理编码地址
  timestamp: number;      // 获取时间
}

export interface LocationError {
  code: number;           // 1=PERMISSION_DENIED 2=POSITION_UNAVAILABLE 3=TIMEOUT
  message: string;
}

interface UseGeolocationReturn {
  location: LocationData | null;
  error: LocationError | null;
  loading: boolean;
  supported: boolean;
  refresh: () => void;
}

/**
 * 获取浏览器定位信息
 * - 自动请求权限并获取当前位置
 * - 支持 refresh 重新获取
 * - 返回定位数据、错误状态、加载状态
 */
export function useGeolocation(options?: {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  autoFetch?: boolean;
}): UseGeolocationReturn {
  const {
    enableHighAccuracy = true,
    timeout = 15000,
    maximumAge = 30000,
    autoFetch = true,
  } = options || {};

  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<LocationError | null>(null);
  const [loading, setLoading] = useState(false);

  const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  const fetchLocation = useCallback(() => {
    if (!supported) {
      setError({ code: -1, message: '您的浏览器不支持定位功能' });
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
        setLoading(false);
      },
      (err) => {
        const messages: Record<number, string> = {
          1: '您拒绝了定位权限，请在浏览器设置中允许定位',
          2: '无法获取位置信息，请检查设备定位是否开启',
          3: '定位请求超时，请稍后重试',
        };
        setError({
          code: err.code,
          message: messages[err.code] || err.message,
        });
        setLoading(false);
      },
      { enableHighAccuracy, timeout, maximumAge }
    );
  }, [supported, enableHighAccuracy, timeout, maximumAge]);

  useEffect(() => {
    if (autoFetch) {
      fetchLocation();
    }
  }, [autoFetch, fetchLocation]);

  return { location, error, loading, supported, refresh: fetchLocation };
}

/**
 * 计算两个经纬度坐标之间的距离(Haversine公式)
 * @returns 距离，单位米
 */
export function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000; // 地球半径(米)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 格式化定位信息为可读文本
 */
export function formatLocation(location: LocationData | null | undefined): string {
  if (!location) return '未知位置';
  const latDir = location.latitude >= 0 ? 'N' : 'S';
  const lonDir = location.longitude >= 0 ? 'E' : 'W';
  return `${Math.abs(location.latitude).toFixed(4)}°${latDir}, ${Math.abs(location.longitude).toFixed(4)}°${lonDir}`;
}

/**
 * 格式化距离为可读文本
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}
