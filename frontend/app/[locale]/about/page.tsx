"use client";

import ArabesquePattern from "@/components/ArabesquePattern";
import { SectionHeading } from "@/components/ui";
import { useLocale } from "@/lib/locale-context";
import { ACADEMIC_YEAR, INSTITUTION, SUPERVISOR, TEAM } from "@/lib/team";

/**
 * The problem statement and abstract are reproduced verbatim from the project
 * brief, in both languages, because the examination committee checks them
 * against the submitted document word for word.
 */
const PROBLEM = {
  en:
    "The core problem is that traditional career counseling is often inaccessible, "
    + "expensive, and non-personalized, leading many individuals to make uninformed "
    + "decisions that result in career dissatisfaction and skill mismatches. "
    + "Conventional methods rely on static aptitude tests and limited human resources, "
    + "which fail to keep pace with a rapidly evolving job market and the emergence of "
    + "new technical roles. Consequently, there is a critical need for a scalable, "
    + "data-driven AI system that can analyze vast amounts of real-time industry data "
    + "and individual user profiles to provide objective, personalized, and actionable "
    + "career pathways.",
  ar:
    "تكمن المشكلة الأساسية في أن الإرشاد المهني التقليدي كثيراً ما يكون صعب المنال "
    + "ومكلفاً وغير مخصّص، ما يدفع كثيرين إلى اتخاذ قرارات غير مبنية على معرفة كافية "
    + "تؤدي إلى عدم الرضا المهني وعدم توافق المهارات. وتعتمد الأساليب التقليدية على "
    + "اختبارات استعداد ثابتة وموارد بشرية محدودة، وهي تعجز عن مواكبة سوق عمل سريع "
    + "التغيّر وظهور أدوار تقنية جديدة. وبناءً عليه، ثمة حاجة ماسّة إلى نظام ذكاء "
    + "اصطناعي قابل للتوسّع وقائم على البيانات، يستطيع تحليل كميات كبيرة من بيانات "
    + "القطاعات الآنية وملفات المستخدمين الفردية ليقدّم مسارات مهنية موضوعية ومخصّصة "
    + "وقابلة للتنفيذ.",
};

const ABSTRACT = {
  en: [
    "Many students face difficulty in selecting appropriate career paths due to limited "
    + "access to personalized and reliable guidance. Traditional career counseling methods "
    + "are often generalized, inconsistent, or unavailable to all learners, resulting in "
    + "decisions based on uncertainty rather than informed self-assessment. Consequently, "
    + "students may choose academic subjects or career directions that do not align with "
    + "their abilities, interests, or personality traits, leading to long-term academic "
    + "dissatisfaction and professional challenges.",
    "The proposed AI Career Guidance System addresses this issue by providing a "
    + "data-driven, accessible, and personalized platform for career planning. The system "
    + "leverages machine learning techniques to analyze key student data, including "
    + "academic performance, personal interests, and personality profiles. Based on this "
    + "analysis, it generates tailored career recommendations that align with each "
    + "student's unique strengths and preferences. Additionally, the system identifies "
    + "skill gaps and suggests relevant courses and learning pathways to support students "
    + "in achieving their career goals.",
    "By offering continuous, individualized support, the AI Career Guidance System "
    + "enhances decision-making and reduces reliance on guesswork. It ensures that "
    + "students receive accurate and timely guidance, empowering them to make informed "
    + "academic and professional choices. Ultimately, this approach contributes to "
    + "improved educational outcomes and better alignment between students' potential and "
    + "their future careers.",
  ],
  ar: [
    "يواجه كثير من الطلبة صعوبة في اختيار المسارات المهنية المناسبة بسبب محدودية الوصول "
    + "إلى إرشاد مخصّص وموثوق. فأساليب الإرشاد المهني التقليدية كثيراً ما تكون عامة أو "
    + "غير متسقة أو غير متاحة لجميع المتعلمين، ما يجعل القرارات مبنية على عدم اليقين بدل "
    + "التقييم الذاتي المستنير. وبناءً على ذلك، قد يختار الطلبة موادّ دراسية أو اتجاهات "
    + "مهنية لا تتوافق مع قدراتهم أو ميولهم أو سماتهم الشخصية، ما يؤدي إلى عدم رضا "
    + "أكاديمي طويل الأمد وتحديات مهنية.",
    "ويعالج نظام الإرشاد المهني بالذكاء الاصطناعي المقترح هذه المشكلة عبر توفير منصّة "
    + "قائمة على البيانات، متاحة ومخصّصة، للتخطيط المهني. ويستفيد النظام من تقنيات تعلّم "
    + "الآلة لتحليل بيانات الطالب الأساسية، بما فيها الأداء الأكاديمي والميول الشخصية "
    + "وملامح الشخصية. وبناءً على هذا التحليل، يولّد توصيات مهنية مصمّمة لتتوافق مع نقاط "
    + "قوة كل طالب وتفضيلاته. كما يحدّد النظام الفجوات المهارية ويقترح دورات ومسارات تعلّم "
    + "مناسبة لدعم الطلبة في تحقيق أهدافهم المهنية.",
    "ومن خلال تقديم دعم مستمر وفردي، يعزّز نظام الإرشاد المهني بالذكاء الاصطناعي جودة "
    + "اتخاذ القرار ويقلّل الاعتماد على التخمين. ويضمن حصول الطلبة على إرشاد دقيق وفي "
    + "وقته، بما يمكّنهم من اتخاذ خيارات أكاديمية ومهنية مستنيرة. وفي المحصّلة، يسهم هذا "
    + "النهج في تحسين المخرجات التعليمية وتحقيق توافق أفضل بين إمكانات الطلبة ومهنهم "
    + "المستقبلية.",
  ],
};

export default function AboutPage() {
  const { locale, t } = useLocale();

  const method = [
    { title: t.about.m1Title, body: t.about.m1Body },
    { title: t.about.m2Title, body: t.about.m2Body },
    { title: t.about.m3Title, body: t.about.m3Body },
    { title: t.about.m4Title, body: t.about.m4Body },
  ];

  return (
    <>
      <section className="relative overflow-hidden border-b">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 text-[var(--brand)]">
          <ArabesquePattern opacity={0.06} />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 py-14 sm:px-6">
          <h1 className="text-3xl font-black sm:text-4xl">{t.about.title}</h1>
          <p className="mt-3 muted">{t.brand.tagline}</p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-14 px-4 py-14 sm:px-6">
        <section aria-labelledby="problem">
          <SectionHeading id="problem" title={t.about.problemTitle} />
          <p className="leading-relaxed">{PROBLEM[locale]}</p>
        </section>

        <section aria-labelledby="abstract">
          <SectionHeading id="abstract" title={t.about.abstractTitle} />
          <div className="space-y-4">
            {ABSTRACT[locale].map((paragraph, index) => (
              <p key={index} className="leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        <section aria-labelledby="method">
          <SectionHeading id="method" title={t.about.methodTitle} subtitle={t.about.methodIntro} />
          <ol className="grid gap-4 sm:grid-cols-2">
            {method.map((item) => (
              <li key={item.title} className="card p-5">
                <h3 className="font-bold">{item.title}</h3>
                <p className="mt-1.5 text-sm muted leading-relaxed">{item.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="data" className="card p-6">
          <h2 id="data" className="text-lg font-bold">
            {t.about.dataTitle}
          </h2>
          <p className="mt-2 text-sm leading-relaxed muted">{t.about.dataBody}</p>
        </section>

        <section aria-labelledby="team">
          <SectionHeading id="team" title={t.about.teamTitle} />
          <ul className="grid gap-3 sm:grid-cols-2">
            {TEAM.map((member) => (
              <li key={member.name} className="card flex items-center gap-4 p-4">
                <span
                  aria-hidden="true"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--brand)]/12 font-bold text-[var(--brand)]"
                >
                  {member.name.charAt(0)}
                </span>
                <span>
                  <span className="block font-semibold">{member.name}</span>
                  <span className="block text-xs muted">{t.about[member.roleKey]}</span>
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-6 card grid gap-3 p-5 text-sm sm:grid-cols-3">
            <div>
              <dt className="muted">{t.about.supervisor}</dt>
              <dd className="mt-0.5 font-semibold">{SUPERVISOR}</dd>
            </div>
            <div>
              <dt className="muted">{t.about.institution}</dt>
              <dd className="mt-0.5 font-semibold">{INSTITUTION}</dd>
            </div>
            <div>
              <dt className="muted">{t.about.academicYear}</dt>
              <dd className="mt-0.5 font-semibold ltr-nums">{ACADEMIC_YEAR}</dd>
            </div>
          </dl>
        </section>
      </div>
    </>
  );
}
