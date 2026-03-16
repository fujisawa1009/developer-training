"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserFormState } from "../actions";

type CohortYear = { id: string; label: string };
type Department  = { id: string; name: string };

type DefaultValues = {
  name?:         string;
  email?:        string;
  role?:         string;
  cohortYearId?: string | null;
  departmentId?: string | null;
};

type Props = {
  action:        (prevState: UserFormState, formData: FormData) => Promise<UserFormState>;
  cohortYears:   CohortYear[];
  departments:   Department[];
  defaultValues?: DefaultValues;
  isEdit?:       boolean;
  submitLabel?:  string;
};

const ROLE_OPTIONS = [
  { value: "learner",    label: "受講者" },
  { value: "instructor", label: "講師/メンター" },
  { value: "admin",      label: "管理者" },
  { value: "hr",         label: "HR担当者" },
];

export function UserForm({
  action,
  cohortYears,
  departments,
  defaultValues,
  isEdit = false,
  submitLabel = "作成する",
}: Props) {
  const [state, dispatch, isPending] = useActionState(action, null);

  return (
    <form action={dispatch} className="space-y-5">
      {state?.message && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {state.message}
        </p>
      )}

      {/* 氏名 */}
      <div className="space-y-1.5">
        <Label htmlFor="name">氏名 *</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={defaultValues?.name ?? ""}
          placeholder="例: 山田 太郎"
          aria-invalid={!!state?.errors?.name}
        />
        {state?.errors?.name && (
          <p className="text-xs text-destructive">{state.errors.name.join(", ")}</p>
        )}
      </div>

      {/* メールアドレス */}
      <div className="space-y-1.5">
        <Label htmlFor="email">メールアドレス *</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={defaultValues?.email ?? ""}
          placeholder="例: yamada@example.com"
          aria-invalid={!!state?.errors?.email}
        />
        {state?.errors?.email && (
          <p className="text-xs text-destructive">{state.errors.email.join(", ")}</p>
        )}
      </div>

      {/* パスワード */}
      <div className="space-y-1.5">
        <Label htmlFor="password">
          パスワード {isEdit ? "" : "*"}
        </Label>
        {isEdit && (
          <p className="text-xs text-muted-foreground">
            変更する場合のみ入力してください（空欄で現在のパスワードを維持）
          </p>
        )}
        <Input
          id="password"
          name="password"
          type="password"
          required={!isEdit}
          placeholder={isEdit ? "変更する場合のみ入力" : "8文字以上"}
          aria-invalid={!!state?.errors?.password}
        />
        {state?.errors?.password && (
          <p className="text-xs text-destructive">{state.errors.password.join(", ")}</p>
        )}
      </div>

      {/* ロール */}
      <div className="space-y-1.5">
        <Label htmlFor="role">ロール *</Label>
        <select
          id="role"
          name="role"
          defaultValue={defaultValues?.role ?? "learner"}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors"
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {state?.errors?.role && (
          <p className="text-xs text-destructive">{state.errors.role.join(", ")}</p>
        )}
      </div>

      {/* 年度コーホート */}
      <div className="space-y-1.5">
        <Label htmlFor="cohortYearId">年度コーホート</Label>
        <select
          id="cohortYearId"
          name="cohortYearId"
          defaultValue={defaultValues?.cohortYearId ?? ""}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors"
        >
          <option value="">— 未設定 —</option>
          {cohortYears.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* 部署 */}
      <div className="space-y-1.5">
        <Label htmlFor="departmentId">部署</Label>
        <select
          id="departmentId"
          name="departmentId"
          defaultValue={defaultValues?.departmentId ?? ""}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors"
        >
          <option value="">— 未設定 —</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "処理中..." : submitLabel}
      </Button>
    </form>
  );
}
