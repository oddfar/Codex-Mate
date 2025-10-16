import { useCallback, useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { LoadingState } from '../types'

/**
 * 通用的数据加载 Hook
 */
export function useInvoke<T>(
  command: string,
  params?: Record<string, any>
): [T | null, boolean, string | null, () => Promise<void>] {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await invoke<T>(command, params)
      setData(result)
    } catch (e: any) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [command, params])

  return [data, loading, error, fetch]
}

/**
 * 通用的加载状态管理 Hook
 */
export function useLoadingState(): [
  LoadingState,
  (loading: boolean, error?: string | null, success?: string | null) => void,
  () => void
] {
  const [state, setState] = useState<LoadingState>({
    loading: false,
    error: null,
    success: null,
  })

  const setLoadingState = useCallback(
    (loading: boolean, error: string | null = null, success: string | null = null) => {
      setState({ loading, error, success })
    },
    []
  )

  const clearMessages = useCallback(() => {
    setState((prev) => ({ ...prev, error: null, success: null }))
  }, [])

  return [state, setLoadingState, clearMessages]
}

/**
 * 通用的异步操作 Hook
 */
export function useAsyncAction() {
  const [state, setLoadingState, clearMessages] = useLoadingState()

  const execute = useCallback(
    async <T,>(
      action: () => Promise<T>,
      successMessage?: string
    ): Promise<T | null> => {
      setLoadingState(true)
      try {
        const result = await action()
        setLoadingState(false, null, successMessage || '操作成功')
        return result
      } catch (e: any) {
        setLoadingState(false, String(e))
        return null
      }
    },
    [setLoadingState]
  )

  return { ...state, execute, clearMessages }
}

/**
 * 表单状态管理 Hook
 */
export function useFormState<T>(initialState: T): [
  T,
  (field: keyof T, value: any) => void,
  (newState: T) => void,
  () => void
] {
  const [form, setForm] = useState<T>(initialState)

  const updateField = useCallback((field: keyof T, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }, [])

  const updateForm = useCallback((newState: T) => {
    setForm(newState)
  }, [])

  const resetForm = useCallback(() => {
    setForm(initialState)
  }, [initialState])

  return [form, updateField, updateForm, resetForm]
}
