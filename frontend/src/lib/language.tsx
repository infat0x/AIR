import { useState, createContext, useContext } from 'react'

export const languages = {
  az: {
    title: 'Am I reachable?',
    subtitle: 'Domain Xarici Əlçatanlıq Skanı',
    scan_date: 'Skan tarixi',
    hosts: 'host',
    open: 'açıq',
    closed: 'bağlı',
    search_placeholder: 'Host, IP, texnologiya, server axtar...',
    all: 'Hamısı',
    f_open: 'Açıq',
    f_closed: 'Bağlı',
    f_nodns: 'DNS yox',
    f_shots: 'Ekran görüntüsü',
    col_status: 'Status',
    col_host: 'Host',
    col_domain: 'Domain',
    col_ips: 'IP Ünvanlar',
    col_http: 'HTTP',
    col_tcp: 'TCP',
    col_server: 'Server',
    col_tech: 'Texnologiyalar',
    col_sec: 'Təhlükəsizlik',
    col_url: 'URL',
    col_shot: 'Ekran',
    col_time: 'Müddət',
    zoom: 'Böyüt',
    total_scanned: 'Cəmi taranmış',
    ext_open: 'Xarici əlçatan',
    cl_nodns: 'Bağlı / DNS yox',
    shots_taken: 'Ekran görüntüsü',
    scan_dur: 'Skan müddəti',
    out_files: 'Çıxış faylları',
    apex: 'apex',
    sub: 'sub',
    start_scan: 'Skanı başlat',
    paste_json: 'JSON-ı yapıştırın',
    workers: 'İşçi sayı',
    timeout: 'Zaman aşımı (ms)',
    export: 'Dışa aktar',
    json_format: 'JSON',
    csv_format: 'CSV',
    html_format: 'HTML',
    new_scan: 'Yeni Skan',
    scan_status: 'Skan Durumu',
    loading: 'Yükleniyor...',
    completed: 'Tamamlandı',
    error: 'Hata',
    details: 'Detaylar',
  },
  en: {
    title: 'Am I reachable?',
    subtitle: 'Domain External Reachability Scan',
    scan_date: 'Scan date',
    hosts: 'hosts',
    open: 'open',
    closed: 'closed',
    search_placeholder: 'Search hosts, IPs, technologies, servers...',
    all: 'All',
    f_open: 'Open',
    f_closed: 'Closed',
    f_nodns: 'No DNS',
    f_shots: 'Screenshots',
    col_status: 'Status',
    col_host: 'Host',
    col_domain: 'Domain',
    col_ips: 'IP Addresses',
    col_http: 'HTTP',
    col_tcp: 'TCP',
    col_server: 'Server',
    col_tech: 'Technologies',
    col_sec: 'Security',
    col_url: 'URL',
    col_shot: 'Screenshot',
    col_time: 'Time',
    zoom: 'Zoom',
    total_scanned: 'Total scanned',
    ext_open: 'Externally open',
    cl_nodns: 'Closed / No DNS',
    shots_taken: 'Screenshots taken',
    scan_dur: 'Scan duration',
    out_files: 'Output files',
    apex: 'apex',
    sub: 'sub',
    start_scan: 'Start Scan',
    paste_json: 'Paste JSON',
    workers: 'Workers',
    timeout: 'Timeout (ms)',
    export: 'Export',
    json_format: 'JSON',
    csv_format: 'CSV',
    html_format: 'HTML',
    new_scan: 'New Scan',
    scan_status: 'Scan Status',
    loading: 'Loading...',
    completed: 'Completed',
    error: 'Error',
    details: 'Details',
  },
  ru: {
    title: 'Am I reachable?',
    subtitle: 'Сканирование внешней доступности доменов',
    scan_date: 'Дата сканирования',
    hosts: 'хостов',
    open: 'открыт.',
    closed: 'закрыт.',
    search_placeholder: 'Поиск по хосту, IP, технологиям, серверу...',
    all: 'Все',
    f_open: 'Открытые',
    f_closed: 'Закрытые',
    f_nodns: 'Нет DNS',
    f_shots: 'Скриншоты',
    col_status: 'Статус',
    col_host: 'Хост',
    col_domain: 'Домен',
    col_ips: 'IP Адреса',
    col_http: 'HTTP',
    col_tcp: 'TCP',
    col_server: 'Сервер',
    col_tech: 'Технологии',
    col_sec: 'Безопасность',
    col_url: 'URL',
    col_shot: 'Скриншот',
    col_time: 'Время',
    zoom: 'Увеличить',
    total_scanned: 'Всего просканировано',
    ext_open: 'Внешне доступно',
    cl_nodns: 'Закрыто / Нет DNS',
    shots_taken: 'Скриншотов получено',
    scan_dur: 'Длительность',
    out_files: 'Выходные файлы',
    apex: 'apex',
    sub: 'sub',
    start_scan: 'Начать сканирование',
    paste_json: 'Вставить JSON',
    workers: 'Рабочих процессов',
    timeout: 'Тайм-аут (мс)',
    export: 'Экспорт',
    json_format: 'JSON',
    csv_format: 'CSV',
    html_format: 'HTML',
    new_scan: 'Новое сканирование',
    scan_status: 'Статус сканирования',
    loading: 'Загрузка...',
    completed: 'Завершено',
    error: 'Ошибка',
    details: 'Детали',
  },
} as const

export type Language = keyof typeof languages
export type Translations = typeof languages[Language]

const LanguageContext = createContext<{
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: keyof Translations) => string
} | null>(null)

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    return {
      language: 'en' as Language,
      setLanguage: () => {},
      t: (key: keyof Translations) => languages.en[key],
    }
  }
  return context
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en')

  const t = (key: keyof Translations) => {
    return languages[language][key]
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}
