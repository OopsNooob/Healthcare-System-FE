import { useTranslation } from "react-i18next";

export function AboutUs() {
  const { t } = useTranslation();

  return (
    <main className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">{t("sharedPages.aboutUs.title")}</h1>
          <a href="/" className="px-6 py-2 bg-brand text-white font-semibold rounded-lg hover:bg-blue-700 transition">
            ← {t("sharedPages.back")}
          </a>
        </div>

        {/* Mission */}
        <section className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t("sharedPages.aboutUs.missionTitle")}</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {t("sharedPages.aboutUs.missionDesc")}
          </p>
        </section>

        {/* Core Values */}
        <section className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t("sharedPages.aboutUs.valuesTitle")}</h2>
          <div className="space-y-4">
            {(t("sharedPages.aboutUs.values", { returnObjects: true }) as { title: string; desc: string }[]).map((value) => (
              <div key={value.title} className="flex gap-3">
                <div className="text-brand font-bold text-lg">•</div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{value.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{value.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Platform Stats */}
        <section className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-6">{t("sharedPages.aboutUs.statsTitle")}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(t("sharedPages.aboutUs.stats", { returnObjects: true }) as { label: string; value: string }[]).map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold mb-2">{stat.value}</div>
                <p className="text-blue-100 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Admin Features */}
        <section className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t("sharedPages.aboutUs.adminFeaturesTitle")}</h2>
          <div className="space-y-3">
            {(t("sharedPages.aboutUs.adminFeatures", { returnObjects: true }) as string[]).map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <span className="text-green-500 font-bold">✓</span>
                {feature}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
