import { useTranslation } from "react-i18next";

export function Services() {
  const { t } = useTranslation();

  const services = [
    {
      title: t("sharedPages.services.cards.docManagement.title"),
      description: t("sharedPages.services.cards.docManagement.desc"),
      features: t("sharedPages.services.cards.docManagement.features", { returnObjects: true }) as string[],
    },
    {
      title: t("sharedPages.services.cards.patientManagement.title"),
      description: t("sharedPages.services.cards.patientManagement.desc"),
      features: t("sharedPages.services.cards.patientManagement.features", { returnObjects: true }) as string[],
    },
    {
      title: t("sharedPages.services.cards.systemAnalytics.title"),
      description: t("sharedPages.services.cards.systemAnalytics.desc"),
      features: t("sharedPages.services.cards.systemAnalytics.features", { returnObjects: true }) as string[],
    },
    {
      title: t("sharedPages.services.cards.complianceSafety.title"),
      description: t("sharedPages.services.cards.complianceSafety.desc"),
      features: t("sharedPages.services.cards.complianceSafety.features", { returnObjects: true }) as string[],
    },
  ];

  return (
    <main className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{t("sharedPages.services.title")}</h1>
            <p className="text-gray-600 dark:text-gray-400">{t("sharedPages.services.subtitle")}</p>
          </div>
          <a href="/" className="px-6 py-2 bg-brand text-white font-semibold rounded-lg hover:bg-blue-700 transition whitespace-nowrap">
            ← {t("sharedPages.back")}
          </a>
        </div>        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {services.map((service) => (
            <div key={service.title} className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-6 hover:shadow-md transition">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{service.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{service.description}</p>
              <ul className="space-y-2">
                {service.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <span className="text-blue-500 font-bold">•</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* How to Use */}
        <section className="bg-blue-50 dark:bg-slate-900/50 border border-blue-200 dark:border-slate-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t("sharedPages.services.howToUseTitle")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{t("sharedPages.services.howToUse.step1.title")}</h3>
              <p className="text-gray-700 dark:text-gray-400">{t("sharedPages.services.howToUse.step1.desc")}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{t("sharedPages.services.howToUse.step2.title")}</h3>
              <p className="text-gray-700 dark:text-gray-400">{t("sharedPages.services.howToUse.step2.desc")}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{t("sharedPages.services.howToUse.step3.title")}</h3>
              <p className="text-gray-700 dark:text-gray-400">{t("sharedPages.services.howToUse.step3.desc")}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{t("sharedPages.services.howToUse.step4.title")}</h3>
              <p className="text-gray-700 dark:text-gray-400">{t("sharedPages.services.howToUse.step4.desc")}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
