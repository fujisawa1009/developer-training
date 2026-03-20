/**
 * プレーンオブジェクトから FormData を生成するヘルパー
 */
export function createFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) {
    fd.set(key, value);
  }
  return fd;
}
