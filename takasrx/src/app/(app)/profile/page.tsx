import { UserCog, Mail, Hash, KeyRound } from "lucide-react";
import { requireUser } from "@/lib/require-user";
import ProfileForm from "@/components/ProfileForm";
import PasswordForm from "@/components/PasswordForm";

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
        <UserCog className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
        Hesap Ayarları
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Kendi hesap bilgilerinizi görüntüleyin ve güncelleyin.
      </p>

      <div className="mt-6 flex flex-wrap gap-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-sm">
        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
          <Mail className="h-4 w-4" strokeWidth={1.75} />
          {user.email}
        </span>
        {user.gln && (
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <Hash className="h-4 w-4" strokeWidth={1.75} />
            GLN: {user.gln}
          </span>
        )}
      </div>

      <section className="mt-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Profil Bilgileri</h2>
        <div className="mt-4">
          <ProfileForm
            user={{
              accountType: user.accountType,
              pharmacyName: user.pharmacyName,
              contactName: user.contactName,
              region: user.region,
              district: user.district,
              address: user.address,
            }}
          />
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <KeyRound className="h-4 w-4 text-slate-600 dark:text-slate-400" strokeWidth={1.75} />
          Şifre Değiştir
        </h2>
        <div className="mt-4">
          <PasswordForm />
        </div>
      </section>
    </div>
  );
}
