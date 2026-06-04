"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  Search, 
  Loader2, 
  AlertCircle, 
  ArrowRight, 
  HelpCircle, 
  LogIn, 
  LogOut, 
  Shield, 
  User, 
  Globe, 
  Bookmark, 
  Sparkles,
  Menu,
  X,
  PlusCircle,
  Lock,
  Unlock,
  Key,
  ShieldCheck,
  History,
  Notebook,
  Square,
  Settings
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ResultCard, { DocumentClusterItem, ClusterDocument } from "@/components/ResultCard";
import BookmarksPanel, { BookmarkItem } from "@/components/BookmarksPanel";
import ChatHistoryPanel, { ChatSession } from "@/components/ChatHistoryPanel";
import { useAuth } from "@/context/AuthContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001";

const TRANSLATIONS: Record<string, any> = {
  en: {
    newChat: "New Chat",
    chatHistory: "Chat History",
    notebook: "Notebook",
    signIn: "Sign In",
    signOut: "Sign Out",
    welcomeTitle: "How can I assist your municipal research today?",
    welcomeSubtitle: "CivicAI synthesizes New York City council agendas, zoning minutes, and agency databases into layman-legible reports with precise citations.",
    inputPlaceholder: "Ask CivicAI about city plans, agendas, rezoning, school reports...",
    pleaseWait: "Please wait for current query to finish...",
    settingsTitle: "Account Settings",
    settingsSubtitle: "Manage your authenticated municipal profile",
    fullName: "Full Name",
    emailAddress: "Email Address",
    verifiedRole: "Verified Role",
    districtCoverage: "District Coverage",
    closeSettings: "Close Settings",
    dangerZone: "Danger Zone",
    dangerZoneDesc: "Wipe your custom profile, bookmarks, and entire chat history. This action is irreversible.",
    typeDeleteToConfirm: "To confirm deletion, type DELETE below:",
    deletePlaceholder: "Type DELETE to confirm",
    deleteButton: "Permanently Delete Account",
    deletingButton: "Deleting Account...",
    cloudSyncActive: "Cloud Synchronization Active",
    cloudSyncDesc: "All search logs and notebooks are synced in standard plain-text directly to Google Cloud Firestore.",
    updateName: "Update Name",
    updatingName: "Updating...",
    noBookmarks: "No bookmarked references yet.",
    noChats: "No chat history yet.",
    districtAide: "District Aide",
    verifiedCitizen: "Verified Citizen",
    citations: "Citations",
    documents: "Documents",
    clearHistory: "Clear History",
    loading: "Loading...",
    anonymousNote: "You are browsing anonymously. Sign in to save bookmarks and chat history.",
    notebookLocked: "Personal Notebook Locked",
    notebookLockedDesc: "Sign in with Google to enable your personal notebook, custom annotations, and persistent conversation tracking.",
    publicCitizen: "Public Citizen (Anonymous)",
    districtAideDesc: "District Aide — D",
    verifiedCitizenDesc: "Verified Citizen",
    synthesizing: "Synthesizing public archives and clustering documents...",
    executionFailed: "Execution Failed",
    agentTitle: "CIVICAI REASONING AGENT",
    followups: "Suggested Follow-ups",
    redundantClusters: "Truncated highly similar/redundant clusters from review stream.",
    noClusters: "No clustered documents match your active facet filters. Try clearing filters.",
    bottomInputPlaceholder: "Ask CivicAI about city plans, agendas, rezoning, school reports...",
    stopGenerating: "Stop Generating",
    sendMessage: "Send Message",
    footerText: "CivicAI is backed by real GCP Vertex AI Datastores and Google Gemini 2.5 Flash.",
    suggestions: [
      { label: "Affordable Housing Proposals", desc: "Brooklyn rezoning & developer requirements", q: "affordable housing Brooklyn rezoning" },
      { label: "Stormwater Mitigation Budgets", desc: "Rain gardens & bioswales funding in Queens", q: "stormwater mitigation Queens bioswales budget" },
      { label: "Bike Lanes Safety Expansion", desc: "DOT network protection & cyclist safety reports", q: "protected bike lanes traffic expansion" },
      { label: "Low-Income Transit Subsidies", desc: "Fair Fares qualification limit expansions", q: "Fair Fares expansion poverty eligibility" },
      { label: "Zoning Board Appeals", desc: "Recent land use hearings and variance approvals", q: "BSA zoning appeals land use variance" },
      { label: "Coastal Resiliency Capital", desc: "Seawall projects and flood protection plans", q: "coastal resiliency flood protection budget" },
      { label: "Waste Management Contracts", desc: "DSNY organic waste and composting expansions", q: "composting organic waste collection budget DSNY" },
      { label: "Public School Infrastructure", desc: "SCA capital plans and school modernization", q: "SCA school building capital plan modernization" },
      { label: "Air Quality Monitoring", desc: "Community air sensor programs and emission data", q: "DEP community air quality monitoring sensors" },
      { label: "Special District Rezonings", desc: "Inclusionary housing designations and floor area ratio", q: "Special District inclusionary zoning FAR height limits" },
      { label: "Urban Forest Canopy Goals", desc: "Park tree planting and street greening initiatives", q: "tree canopy expansion street trees urban forestry parks" },
      { label: "Green Taxi Subsidies", desc: "EV charging infrastructure and fleet electrification", q: "EV charging stations yellow green taxi fleet electrification" }
    ]
  },
  es: {
    newChat: "Nuevo Chat",
    chatHistory: "Historial de Chat",
    notebook: "Cuaderno",
    signIn: "Iniciar Sesión",
    signOut: "Cerrar Sesión",
    welcomeTitle: "¿Cómo puedo asistir a su investigación municipal hoy?",
    welcomeSubtitle: "CivicAI sintetiza las agendas del consejo de la ciudad de Nueva York, las actas de zonificación y las bases de datos de agencias en informes legibles por laicos con citas precisas.",
    inputPlaceholder: "Pregunte a CivicAI sobre planes de la ciudad, agendas, rezonificación, informes escolares...",
    pleaseWait: "Espere a que termine la consulta actual...",
    settingsTitle: "Configuración de la Cuenta",
    settingsSubtitle: "Administre su perfil municipal autenticado",
    fullName: "Nombre Completo",
    emailAddress: "Correo Electrónico",
    verifiedRole: "Rol Verificado",
    districtCoverage: "Cobertura del Distrito",
    closeSettings: "Cerrar Configuración",
    dangerZone: "Zona de Peligro",
    dangerZoneDesc: "Elimine su perfil personalizado, marcadores y todo el historial de chat. Esta acción es irreversible.",
    typeDeleteToConfirm: "Para confirmar la eliminación, escriba DELETE a continuación:",
    deletePlaceholder: "Escriba DELETE para confirmar",
    deleteButton: "Eliminar Cuenta Permanentemente",
    deletingButton: "Eliminando Cuenta...",
    cloudSyncActive: "Sincronización en la Nube Activa",
    cloudSyncDesc: "Todos los registros de búsqueda y cuadernos se sincronizan directamente en Google Cloud Firestore.",
    updateName: "Actualizar Nombre",
    updatingName: "Actualizando...",
    noBookmarks: "Aún no hay referencias marcadas.",
    noChats: "Aún no hay historial de chat.",
    districtAide: "Asistente de Distrito",
    verifiedCitizen: "Ciudadano Verificado",
    citations: "Citas",
    documents: "Documentos",
    clearHistory: "Borrar Historial",
    loading: "Cargando...",
    anonymousNote: "Está navegando de forma anónima. Inicie sesión para guardar marcadores e historial.",
    notebookLocked: "Cuaderno Personal Bloqueado",
    notebookLockedDesc: "Inicie sesión con Google para habilitar su cuaderno personal, anotaciones personalizadas y seguimiento persistente de conversaciones.",
    publicCitizen: "Ciudadano Público (Anónimo)",
    districtAideDesc: "Asistente de Distrito — D",
    verifiedCitizenDesc: "Ciudadano Verificado",
    synthesizing: "Sintetizando archivos públicos y agrupando documentos...",
    executionFailed: "Ejecución Fallida",
    agentTitle: "AGENTE DE RAZONAMIENTO CIVICAI",
    followups: "Seguimientos Sugeridos",
    redundantClusters: "Se truncaron clústeres muy similares/redundantes del flujo de revisión.",
    noClusters: "No hay documentos agrupados que coincidan con sus filtros de facetas activos. Intente borrar filtros.",
    bottomInputPlaceholder: "Pregunte a CivicAI sobre planes de la ciudad, agendas, rezonificación, informes escolares...",
    stopGenerating: "Detener Generación",
    sendMessage: "Enviar Mensaje",
    footerText: "CivicAI está respaldado por GCP Vertex AI Datastores reales y Google Gemini 2.5 Flash.",
    suggestions: [
      { label: "Propuestas de Vivienda Asequible", desc: "Rezonificación de Brooklyn y requisitos de desarrolladores", q: "vivienda asequible rezonificación de Brooklyn" },
      { label: "Presupuestos de Mitigación de Aguas Pluviales", desc: "Financiamiento de jardines de lluvia en Queens", q: "mitigación de aguas pluviales presupuesto de Queens" },
      { label: "Expansión de Seguridad en Ciclovías", desc: "Protección de la red del DOT e informes de ciclistas", q: "ciclovías protegidas expansión de tráfico" },
      { label: "Subsidios de Tránsito para Bajos Ingresos", desc: "Expansión de límites para tarifas justas (Fair Fares)", q: "expansión de Fair Fares elegibilidad de pobreza" },
      { label: "Apelaciones de la Junta de Zonificación", desc: "Audiencias recientes de uso de suelo y variaciones", q: "apelaciones de zonificación BSA variación de uso de suelo" },
      { label: "Capital de Resiliencia Costera", desc: "Proyectos de rompeolas y planes de protección contra inundaciones", q: "resiliencia costera presupuesto de protección contra inundaciones" },
      { label: "Contratos de Gestión de Residuos", desc: "Expansión de residuos orgánicos y compostaje de DSNY", q: "compostaje recolección de residuos orgánicos presupuesto DSNY" },
      { label: "Infraestructura de Escuelas Públicas", desc: "Planes de capital de SCA y modernización escolar", q: "plan de capital de construcción de escuelas SCA" },
      { label: "Monitoreo de Calidad del Aire", desc: "Programas de sensores comunitarios y datos de emisiones", q: "monitoreo de calidad del aire sensores comunitarios DEP" },
      { label: "Rezonificaciones de Distritos Especiales", desc: "Designaciones de vivienda inclusiva y límites de altura", q: "zonificación inclusiva de distrito especial" },
      { label: "Metas de Cobertura Forestal Urbana", desc: "Plantación de árboles en parques e iniciativas ecológicas", q: "expansión de cobertura de árboles silvicultura urbana" },
      { label: "Subsidios para Taxis Ecológicos", desc: "Infraestructura de carga de vehículos eléctricos", q: "estaciones de carga de vehículos eléctricos electrificación de taxis" }
    ]
  },
  zh: {
    newChat: "新建对话",
    chatHistory: "历史对话",
    notebook: "笔记本",
    signIn: "登录",
    signOut: "退出登录",
    welcomeTitle: "今天我能如何协助您的市政研究？",
    welcomeSubtitle: "CivicAI 将纽约市议会听证会议程、分区会议记录和机构数据库综合为通俗易懂的报告，并附有精确的引用。",
    inputPlaceholder: "向 CivicAI 咨询城市计划、议程、重新分区、学校报告等...",
    pleaseWait: "请等待当前查询完成...",
    settingsTitle: "账户设置",
    settingsSubtitle: "管理您的已认证市政个人资料",
    fullName: "全名",
    emailAddress: "电子邮件",
    verifiedRole: "已验证角色",
    districtCoverage: "区域覆盖",
    closeSettings: "关闭设置",
    dangerZone: "危险区域",
    dangerZoneDesc: "擦除您的自定义个人资料、书签和完整的聊天记录。此操作不可逆。",
    typeDeleteToConfirm: "要确认删除，请在下方输入 DELETE：",
    deletePlaceholder: "输入 DELETE 以确认",
    deleteButton: "永久删除账户",
    deletingButton: "正在删除账户...",
    cloudSyncActive: "云端同步已激活",
    cloudSyncDesc: "所有搜索日志和笔记本都会以标准纯文本形式直接同步到 Google Cloud Firestore。",
    updateName: "更新姓名",
    updatingName: "更新中...",
    noBookmarks: "暂无书签参考。",
    noChats: "暂无历史对话。",
    districtAide: "区域助理",
    verifiedCitizen: "已验证市民",
    citations: "引用",
    documents: "文件",
    clearHistory: "清除历史",
    loading: "加载中...",
    anonymousNote: "您正在匿名浏览。登录以保存书签和聊天历史记录。",
    notebookLocked: "个人笔记本已锁定",
    notebookLockedDesc: "使用 Google 登录以启用您的个人笔记本、自定义注释和持续的对话跟踪。",
    publicCitizen: "市民公众 (匿名)",
    districtAideDesc: "区域助理 — D",
    verifiedCitizenDesc: "已验证市民",
    synthesizing: "正在综合公共档案并对文件进行聚类...",
    executionFailed: "执行失败",
    agentTitle: "CIVICAI 推理代理",
    followups: "建议的后续问题",
    redundantClusters: "已截断审核流中高度相似/冗余的聚类。",
    noClusters: "没有聚类文件匹配您的活动分面过滤器。请尝试清除过滤器。",
    bottomInputPlaceholder: "向 CivicAI 咨询城市计划、议程、重新分区、学校报告等...",
    stopGenerating: "停止生成",
    sendMessage: "发送消息",
    footerText: "CivicAI 由真实的 GCP Vertex AI 数据存储和 Google Gemini 2.5 Flash 提供支持。",
    suggestions: [
      { label: "经济适用房提案", desc: "布鲁克林重新分区和开发商要求", q: "经济适用房布鲁克林重新分区" },
      { label: "雨水缓解预算", desc: "皇后区雨水花园和生物滞留池资金", q: "雨水缓解皇后区生物滞留预算" },
      { label: "自行车道安全扩展", desc: "交通局网络保护和自行车手安全报告", q: "保护性自行车道交通扩展" },
      { label: "低收入交通补贴", desc: "公平票价（Fair Fares）资格限制扩展", q: "公平票价扩展贫困资格" },
      { label: "分区委员会上诉", desc: "近期土地使用听证会和差异批准", q: "BSA分区上诉土地使用差异" },
      { label: "海岸弹性资本", desc: "防波堤项目和防洪计划", q: "海岸弹性防洪预算" },
      { label: "废物管理合同", desc: "纽约市环卫局（DSNY）有机废物和堆肥扩展", q: "堆肥有机废物收集预算DSNY" },
      { label: "公立学校基础设施", desc: "学校建设管理局（SCA）资本计划和学校现代化", q: "SCA学校建筑资本计划现代化" },
      { label: "空气质量监测", desc: "社区空气传感器计划和排放数据", q: "环境保护局（DEP）社区空气质量监测传感器" },
      { label: "特区重新分区", desc: "包容性住房指定和容积率限制", q: "特区包容性分区容积率高度限制" },
      { label: "城市森林覆盖率目标", desc: "公园树木种植和街道绿化计划", q: "树木覆盖率扩展街道树木城市林业公园" },
      { label: "绿色出租车补贴", desc: "电动汽车充电基础设施和车队电气化", q: "电动汽车充电站黄色绿色出租车车队电气化" }
    ]
  },
  bn: {
    newChat: "নতুন চ্যাট",
    chatHistory: "চ্যাটের ইতিহাস",
    notebook: "নোটবুক",
    signIn: "সাইন ইন",
    signOut: "সাইন আউট",
    welcomeTitle: "আজ আমি আপনার পৌরসভার গবেষণায় কীভাবে সহায়তা করতে পারি?",
    welcomeSubtitle: "CivicAI নিউ ইয়র্ক সিটি কাউন্সিলের শুনানি, সংস্থার পরিকল্পনা এবং আইনি নথি অনুসন্ধান, বিশ্লেষণ এবং সংশ্লেষণ করে সুনির্দিষ্ট উদ্ধৃতি সহ সহজ প্রতিবেদন তৈরি করে।",
    inputPlaceholder: "শহরের পরিকল্পনা, এজেন্ডা, রিজোনিং, স্কুলের প্রতিবেদন সম্পর্কে CivicAI-কে জিজ্ঞাসা করুন...",
    pleaseWait: "অনুগ্রহ করে বর্তমান অনুসন্ধান শেষ হওয়ার জন্য অপেক্ষা করুন...",
    settingsTitle: "অ্যাকাউন্ট সেটিংস",
    settingsSubtitle: "আপনার যাচাইকৃত পৌর প্রোফাইল পরিচালনা করুন",
    fullName: "পুরো নাম",
    emailAddress: "ইমেল ঠিকানা",
    verifiedRole: "যাচাইকৃত ভূমিকা",
    districtCoverage: "ডিস্ট্রিক্ট কভারেজ",
    closeSettings: "সেটিংস বন্ধ করুন",
    dangerZone: "ডেঞ্জার জোন",
    dangerZoneDesc: "আপনার কাস্টম প্রোফাইল, বুকমার্ক এবং সম্পূর্ণ চ্যাটের ইতিহাস মুছে ফেলুন। এই কাজটি অপরিবর্তনীয়।",
    typeDeleteToConfirm: "মুছে ফেলার বিষয়টি নিশ্চিত করতে, নীচে DELETE লিখুন:",
    deletePlaceholder: "নিশ্চিত করতে DELETE লিখুন",
    deleteButton: "স্থায়ীভাবে অ্যাকাউন্ট মুছুন",
    deletingButton: "অ্যাকাউন্ট মুছে ফেলা হচ্ছে...",
    cloudSyncActive: "ক্লাউড সিঙ্ক্রোনাইজেশন সক্রিয়",
    cloudSyncDesc: "সমস্ত অনুসন্ধান লগ এবং নোটবুক সরাসরি গুগল ক্লাউড ফায়ারস্টোরে সিঙ্ক করা হয়।",
    updateName: "নাম আপডেট করুন",
    updatingName: "আপডেট হচ্ছে...",
    noBookmarks: "এখনও কোনও বুকমার্ক করা উল্লেখ নেই।",
    noChats: "এখনও কোনও চ্যাটের ইতিহাস নেই।",
    districtAide: "ডিস্ট্রিক্ট এইড",
    verifiedCitizen: "যাচাইকৃত নাগরিক",
    citations: "উদ্ধৃতি",
    documents: "নথি",
    clearHistory: "ইতিহাস মুছুন",
    loading: "লোড হচ্ছে...",
    anonymousNote: "আপনি বেনামে ব্রাউজ করছেন। বুকমার্ক এবং চ্যাটের ইতিহাস সংরক্ষণ করতে সাইন ইন করুন।",
    notebookLocked: "ব্যক্তিগত নোটবুক লক করা আছে",
    notebookLockedDesc: "আপনার ব্যক্তিগত নোটবুক, কাস্টম টীকা এবং চ্যাটের ইতিহাস সংরক্ষণ করতে গুগল দিয়ে সাইন ইন করুন।",
    publicCitizen: "সাধারণ নাগরিক (বেনামী)",
    districtAideDesc: "ডিস্ট্রিক্ট এইড — D",
    verifiedCitizenDesc: "যাচাইকৃত নাগরিক",
    synthesizing: "পাবলিক আর্কাইভ সংশ্লেষণ এবং নথি ক্লাস্টার করা হচ্ছে...",
    executionFailed: "এক্সিকিউশন ব্যর্থ হয়েছে",
    agentTitle: "CIVICAI রিজনিং এজেন্ট",
    followups: "প্রস্তাবিত ফলো-আপ",
    redundantClusters: "অত্যন্ত অভিন্ন/অপ্রয়োজনীয় ক্লাস্টারগুলি পর্যালোচনা স্ট্রীম থেকে ছেঁটে ফেলা হয়েছে।",
    noClusters: "কোনো ক্লাস্টার করা নথি আপনার সক্রিয় ফিল্টারগুলির সাথে মিলছে না। ফিল্টারগুলি সাফ করার চেষ্টা করুন।",
    bottomInputPlaceholder: "শহরের পরিকল্পনা, এজেন্ডা, রিজোনিং, স্কুলের প্রতিবেদন সম্পর্কে CivicAI-কে জিজ্ঞাসা করুন...",
    stopGenerating: "জেনারেট করা বন্ধ করুন",
    sendMessage: "বার্তা পাঠান",
    footerText: "CivicAI আসল GCP Vertex AI ডেটাস্টোর এবং গুগল জেমিনি ২.৫ ফ্ল্যাশ দ্বারা চালিত।",
    suggestions: [
      { label: "সাশ্রয়ী মূল্যের আবাসন প্রস্তাব", desc: "ব্রুকলিন রিজোনিং এবং ডেভেলপারদের প্রয়োজনীয়তা", q: "affordable housing Brooklyn rezoning" },
      { label: "বৃষ্টির জল নিষ্কাশন বাজেট", desc: "কুইন্সে রেইন গার্ডেন এবং বায়োসওয়েলসের জন্য অর্থায়ন", q: "stormwater mitigation Queens bioswales budget" },
      { label: "বাইক লেনের নিরাপত্তা সম্প্রসারণ", desc: "ডিওটি নেটওয়ার্ক সুরক্ষা এবং সাইক্লিস্টদের নিরাপত্তা প্রতিবেদন", q: "protected bike lanes traffic expansion" },
      { label: "স্বল্প আয়ের ট্রানজিট ভর্তুকি", desc: "ফেয়ার ফেয়ার্স (Fair Fares) যোগ্যতার সীমা সম্প্রসারণ", q: "Fair Fares expansion poverty eligibility" },
      { label: "জোনিং বোর্ড আপিল", desc: "সাম্প্রতিক ভূমি ব্যবহার শুনানি এবং অনুমোদন", q: "BSA zoning appeals land use variance" },
      { label: "উপকূলীয় স্থিতিস্থাপকতা তহবিল", desc: "সমুদ্রের বাঁধ প্রকল্প এবং বন্যা সুরক্ষা পরিকল্পনা", q: "coastal resiliency flood protection budget" },
      { label: "বর্জ্য ব্যবস্থাপনা চুক্তি", desc: "ডিএসএনওয়াই জৈব বর্জ্য এবং কম্পোস্টিং সম্প্রসারণ", q: "composting organic waste collection budget DSNY" },
      { label: "সরকারি স্কুলের অবকাঠামো", desc: "এসসিএ ক্যাপিটাল পরিকল্পনা এবং স্কুল আধুনিকীকরণ", q: "SCA school building capital plan modernization" },
      { label: "বায়ু গুণমান পর্যবেক্ষণ", desc: "কমিউনিটি এয়ার সেন্সর প্রোগ্রাম এবং নির্গমন ডেটা", q: "DEP community air quality monitoring sensors" },
      { label: "বিশেষ ডিস্ট্রিক্ট রিজোনিং", desc: "অন্তর্ভুক্তিমূলক আবাসন উপাধি এবং ফ্লোর এরিয়া অনুপাত", q: "Special District inclusionary zoning FAR height limits" },
      { label: "শহুরে বনের কভারেজ লক্ষ্য", desc: "পার্কে গাছ রোপণ এবং রাস্তা সবুজকরণ উদ্যোগ", q: "tree canopy expansion street trees urban forestry parks" },
      { label: "সবুজ ট্যাক্সি ভর্তুকি", desc: "ইভি চার্জিং অবকাঠামো এবং ফ্লিট বিদ্যুতায়ন", q: "EV charging stations yellow green taxi fleet electrification" }
    ]
  }
};

interface ChatTurn {
  id: string;
  query: string;
  synthesis: string;
  clusters: DocumentClusterItem[];
  relatedQueries: string[];
  isLoading: boolean;
  error: string | null;
  lang: string;
  timestamp: Date;
}

// Intelligent title generator for chats (summarizes query to 10-12 words)
function generateSessionTitle(query: string): string {
  const clean = query.trim().replace(/\s+/g, " ");
  const words = clean.split(" ");
  if (words.length <= 12) {
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  return words.slice(0, 12).join(" ") + "...";
}

// Inline Typewriter component for synthesis text
interface TypewriterSynthesisProps {
  synthesis: string;
  results: any[];
  onCitationHover: (index: number | null) => void;
  onComplete?: () => void;
}

function TypewriterSynthesis({ synthesis, results, onCitationHover, onComplete }: TypewriterSynthesisProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  // Keep a stable ref to onComplete to avoid resetting the typing interval if parent updates callback reference
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!synthesis) return;
    
    let index = 0;
    const words = synthesis.split(" ");
    let currentText = "";
    
    const interval = setInterval(() => {
      if (index < words.length) {
        currentText += (index === 0 ? "" : " ") + words[index];
        setDisplayedText(currentText);
        index++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
        onCompleteRef.current?.();
      }
    }, 35); // Fast, premium word-by-word streaming

    return () => clearInterval(interval);
  }, [synthesis]);

  const renderFormattedText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\[\d+\])/g);
    
    return parts.map((part, idx) => {
      const match = part.match(/^\[(\d+)\]$/);
      if (match) {
        const docIdx = parseInt(match[1], 10) - 1;
        const targetDoc = results.find(d => d.citation_index === docIdx + 1);
        const docUrl = targetDoc?.document_url;
        
        if (docUrl) {
          return (
            <a
              key={idx}
              href={docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex mx-0.5 cursor-pointer bg-primary/10 hover:bg-primary hover:text-primary-foreground font-mono text-xs font-bold text-primary px-1 rounded border border-primary/25 transition-all select-none hover:scale-105 active:scale-95"
              onMouseEnter={() => onCitationHover(docIdx)}
              onMouseLeave={() => onCitationHover(null)}
              title={`Click to view source: ${targetDoc.title}`}
            >
              {part}
            </a>
          );
        }

        return (
          <span
            key={idx}
            className="inline-flex mx-0.5 cursor-help bg-primary/10 hover:bg-primary hover:text-primary-foreground font-mono text-xs font-bold text-primary px-1 rounded border border-primary/25 transition-all select-none"
            onMouseEnter={() => onCitationHover(docIdx)}
            onMouseLeave={() => onCitationHover(null)}
          >
            {part}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div className="text-sm leading-relaxed text-foreground/85 font-normal break-words">
      {renderFormattedText(displayedText)}
      {isTyping && (
        <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-primary/70 animate-pulse shrink-0 align-middle"></span>
      )}
    </div>
  );
}

export default function Home() {
  const { user, isSignedIn, isLoading: isLoadingAuth, signIn, signOut, updateProfileName, deleteAccount } = useAuth();

  // Chat interface state
  const [query, setQuery] = useState("");
  const [chatTurns, setChatTurns] = useState<ChatTurn[]>([]);
  const [lang, setLang] = useState<string>("en");
  
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  
  // Tracking which turn IDs have already played or should skip the typewriter animation
  const [animatedTurnIds, setAnimatedTurnIds] = useState<Set<string>>(new Set());

  // Stable callback for completion of typewriter animation
  const handleCompleteAnimation = useCallback((turnId: string) => {
    setAnimatedTurnIds((prev) => {
      const next = new Set(prev);
      next.add(turnId);
      return next;
    });
  }, []);
  
  // Left Sidebar collapsible control
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState<"history" | "notebook">("history");

  // Settings Modal & Account Deletion state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Client-side mount tracking & random suggested queries (emoji-free)
  const [mounted, setMounted] = useState(false);
  const [randomSuggestions, setRandomSuggestions] = useState<any[]>([]);

  // Sync edits when settings opens
  useEffect(() => {
    if (isSettingsOpen && user) {
      setEditedName(user.displayName || "");
      setDeleteConfirmText("");
      setDeleteError("");
    }
  }, [isSettingsOpen, user]);

  // Hydrate lang and activeChatId from URL on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const urlLang = searchParams.get("lang");
      if (urlLang && TRANSLATIONS[urlLang]) {
        setLang(urlLang);
      }
      
      const urlChatId = searchParams.get("chat");
      if (urlChatId) {
        setActiveChatId(urlChatId);
      }
    }
  }, []);

  // Shuffles and selects localized suggestions based on lang
  useEffect(() => {
    setMounted(true);
    const suggestionPool = t.suggestions || TRANSLATIONS.en.suggestions;
    const shuffled = [...suggestionPool].sort(() => 0.5 - Math.random());
    setRandomSuggestions(shuffled.slice(0, 4));
  }, [lang]);

  // Firestore Bookmarks & Chat sessions state
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [isBookmarksLoading, setIsBookmarksLoading] = useState(false);
  
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [isChatsLoading, setIsChatsLoading] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Refs for tracking active chat session and network request cancellation
  const activeChatIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatsLoadedRef = useRef(false);

  // Sync activeChatId state with the mutable ref
  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  // Access protection & redirect security check
  useEffect(() => {
    if (isLoadingAuth) return; // Wait for authentication to resolve

    if (activeChatId) {
      if (!isSignedIn) {
        // Unauthenticated users cannot access any historical chat sessions
        setActiveChatId(null);
        setChatTurns([]);
      } else if (!isChatsLoading && chatsLoadedRef.current) {
        // Authenticated users can only access chats belonging to their account
        const hasAccess = chats.some((c) => c.id === activeChatId);
        if (!hasAccess) {
          // Redirect to home page / fresh state if chat doesn't belong to them
          setActiveChatId(null);
          setChatTurns([]);
        }
      }
    }
  }, [isLoadingAuth, isSignedIn, isChatsLoading, activeChatId, chats]);

  // Synchronize activeChatId and lang to URL
  useEffect(() => {
    if (mounted && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (activeChatId) {
        url.searchParams.set("chat", activeChatId);
      } else {
        url.searchParams.delete("chat");
      }
      if (lang && lang !== "en") {
        url.searchParams.set("lang", lang);
      } else {
        url.searchParams.delete("lang");
      }
      
      const currentSearch = window.location.search;
      const targetSearch = url.search;
      if (currentSearch !== targetSearch) {
        window.history.pushState(null, "", url.pathname + url.search);
      }
    }
  }, [activeChatId, lang, mounted]);

  // Auto-hydrate the specific chat session from history once chats are fetched
  useEffect(() => {
    if (activeChatId && chats.length > 0 && chatTurns.length === 0) {
      const targetChat = chats.find(c => c.id === activeChatId);
      if (targetChat) {
        handleSelectChat(targetChat);
      }
    }
  }, [chats, activeChatId, chatTurns]);

  // Anonymous user login prompt modal state
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [signInPromptReason, setSignInPromptReason] = useState("");

  // Hovered citation index
  const [hoveredCitationIndex, setHoveredCitationIndex] = useState<number | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync Bookmarks from Firestore
  const fetchBookmarks = useCallback(async () => {
    if (isLoadingAuth) return;
    if (!isSignedIn || !user.email) {
      setBookmarks([]);
      return;
    }
    setIsBookmarksLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/bookmarks?email=${encodeURIComponent(user.email)}`
      );
      if (response.ok) {
        const data: BookmarkItem[] = await response.json();
        setBookmarks(data);
      }
    } catch (err) {
      console.error("Failed to fetch bookmarks:", err);
    } finally {
      setIsBookmarksLoading(false);
    }
  }, [isLoadingAuth, isSignedIn, user.email]);

  // Sync Chat History from Firestore
  const fetchChats = useCallback(async () => {
    if (isLoadingAuth) return;
    if (!isSignedIn || !user.email) {
      setChats([]);
      chatsLoadedRef.current = true;
      return;
    }
    setIsChatsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/chats?email=${encodeURIComponent(user.email)}`
      );
      if (response.ok) {
        const data = await response.json();
        setChats(data);
      }
    } catch (err) {
      console.error("Failed to fetch chats:", err);
    } finally {
      setIsChatsLoading(false);
      chatsLoadedRef.current = true;
    }
  }, [isLoadingAuth, isSignedIn, user.email]);

  // Fetch bookmarks & chats whenever auth status changes
  useEffect(() => {
    if (!isLoadingAuth) {
      fetchBookmarks();
      fetchChats();
    }
  }, [fetchBookmarks, fetchChats, isSignedIn, isLoadingAuth]);



  // Persist conversation thread as plain text
  const saveChatSession = async (currentTurns: ChatTurn[], chatId: string | null, lastQueryText: string) => {
    if (!isSignedIn || !user.email) return;

    try {
      // 1. Generate descriptive 10-15 word session title if starting a new session
      let sessionTitle = "";
      if (chatId) {
        const existing = chats.find(c => c.id === chatId);
        sessionTitle = existing ? existing.title : generateSessionTitle(lastQueryText);
      } else {
        sessionTitle = generateSessionTitle(currentTurns[0]?.query || lastQueryText);
      }

      const payload = {
        email: user.email,
        title: sessionTitle,
        turns: JSON.stringify(currentTurns),
        id: chatId || undefined
      };

      const response = await fetch(`${API_BASE_URL}/api/chats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.id && !chatId) {
          setActiveChatId(result.id);
          activeChatIdRef.current = result.id;
        }
        fetchChats();
      }
    } catch (err) {
      console.error("Failed to save chat session:", err);
    }
  };

  // Load selected historical chat session
  const handleSelectChat = (chat: ChatSession) => {
    try {
      const parsedTurns: ChatTurn[] = JSON.parse(chat.turns);
      
      // Rehydrate document URLs for historical chats to use current API_BASE_URL
      const formattedTurns = parsedTurns.map(t => {
        const rehydratedClusters = (t.clusters || []).map(cluster => {
          const rehydratedDocs = (cluster.documents || []).map(doc => {
            const rawFilename = doc.filename || doc.document_url?.split("/").pop() || doc.document_id;
            let updatedUrl = doc.document_url;
            if (rawFilename) {
              const finalFilename = rawFilename.includes(".") ? rawFilename : `${rawFilename}.pdf`;
              const decoded = decodeURIComponent(finalFilename);
              const encodedFilename = encodeURIComponent(decoded);
              updatedUrl = `${API_BASE_URL}/api/documents/${encodedFilename}`;
            }
            return {
              ...doc,
              document_url: updatedUrl
            };
          });
          return {
            ...cluster,
            documents: rehydratedDocs
          };
        });
        return {
          ...t,
          clusters: rehydratedClusters,
          timestamp: new Date(t.timestamp)
        };
      });
      
      // Mark all these loaded turns as already animated so they never show typewriter again
      const ids = formattedTurns.map(t => t.id);
      setAnimatedTurnIds(new Set(ids));

      setChatTurns(formattedTurns);
      setActiveChatId(chat.id);
    } catch (err) {
      console.error("Failed to load secure chat turns:", err);
    }
  };

  // Securely delete historical chat session
  const handleDeleteChat = async (chatId: string) => {
    if (!isSignedIn || !user.email) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/chats/${chatId}?email=${encodeURIComponent(user.email)}`,
        { method: "DELETE" }
      );
      if (response.ok) {
        if (activeChatId === chatId) {
          handleNewChat();
        }
        fetchChats();
      }
    } catch (err) {
      console.error("Failed to delete chat session:", err);
    }
  };

  // Trigger search and append to conversation history feed
  const handleSearch = async (searchQuery: string, currentLang: string = lang) => {
    if (!searchQuery.trim()) return;

    // Abort any existing search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const turnId = Date.now().toString();
    
    // Create new turn loading skeleton
    const newTurn: ChatTurn = {
      id: turnId,
      query: searchQuery,
      synthesis: "",
      clusters: [],
      relatedQueries: [],
      isLoading: true,
      error: null,
      lang: currentLang,
      timestamp: new Date()
    };

    setChatTurns((prev) => [...prev, newTurn]);
    setQuery(""); // Clear bottom search input immediately for premium fluid feeling

    try {
      // Map previous turns to Pydantic expected schema (excluding the current loading skeleton)
      const historyPayload = chatTurns
        .filter((t) => !t.isLoading && !t.error)
        .map((t) => ({
          query: t.query,
          synthesis: t.synthesis,
        }));

      const response = await fetch(`${API_BASE_URL}/api/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: searchQuery,
          lang: currentLang,
          history: historyPayload,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch data: Status ${response.status}`);
      }
      const data = await response.json();
      
      // Update turn with retrieved data
      const activeTurn: ChatTurn = {
        ...newTurn,
        synthesis: data.synthesis || "",
        clusters: data.clusters || [],
        relatedQueries: data.related_queries || [],
        isLoading: false,
      };
      const updatedTurns = [...chatTurns, activeTurn];
      setChatTurns(updatedTurns);

      // Auto-save/update chat session in the background
      if (isSignedIn) {
        await saveChatSession(updatedTurns, activeChatIdRef.current, searchQuery);
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setChatTurns((prev) =>
          prev.map((t) =>
            t.id === turnId
              ? {
                  ...t,
                  isLoading: false,
                  error: "Query stopped by user.",
                }
              : t
          )
        );
        return;
      }
      console.error("Search error:", err);
      setChatTurns((prev) =>
        prev.map((t) =>
          t.id === turnId
            ? {
                ...t,
                isLoading: false,
                error: `Unable to connect to the backend server. Make sure FastAPI is running.`,
              }
            : t
        )
      );
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query, lang);
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedLang = e.target.value;
    const url = new URL(window.location.href);
    url.searchParams.set("lang", selectedLang);
    window.location.href = url.toString();
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSearch(suggestion, lang);
  };

  // Start a fresh, clean chat thread
  const handleNewChat = () => {
    setChatTurns([]);
    setActiveChatId(null);
    activeChatIdRef.current = null;
    setAnimatedTurnIds(new Set());
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  // Cancel active search request
  const handleStopSearch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  // Handle Bookmarking to Firestore
  const handleBookmark = async (doc: ClusterDocument, notes: string) => {
    if (!isSignedIn || !user.email) return;

    try {
      const payload = {
        email: user.email,
        document_id: doc.document_id,
        title: doc.title,
        agency: doc.agency,
        doc_type: doc.doc_type,
        year: doc.year,
        status: doc.status,
        notes: notes,
        document_url: doc.document_url || "",
      };

      const response = await fetch(`${API_BASE_URL}/api/bookmarks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        fetchBookmarks();
      }
    } catch (err) {
      console.error("Failed to add bookmark:", err);
    }
  };

  // Handle Unbookmarking
  const handleUnbookmark = async (documentId: string) => {
    if (!isSignedIn || !user.email) return;

    const existing = bookmarks.find((b) => b.document_id === documentId);
    if (!existing || !existing.id) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/bookmarks/${existing.id}?email=${encodeURIComponent(user.email)}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        fetchBookmarks();
      }
    } catch (err) {
      console.error("Failed to delete bookmark:", err);
    }
  };

  // Remove directly from Saved Notebook view
  const handleNotebookRemove = async (bookmarkId: string) => {
    if (!isSignedIn || !user.email) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/bookmarks/${bookmarkId}?email=${encodeURIComponent(user.email)}`,
        {
          method: "DELETE",
        }
      );
      if (response.ok) {
        fetchBookmarks();
      }
    } catch (err) {
      console.error("Failed to delete bookmark:", err);
    }
  };

  // Display elegant login prompt modal
  const handleShowSignInPrompt = (reason: string) => {
    setSignInPromptReason(reason);
    setShowSignInModal(true);
  };

  const isChatWorking = chatTurns.some((t) => t.isLoading);

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/20 text-foreground flex flex-col font-sans selection:bg-primary/10 relative overflow-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      {/* Header Area */}
      <header className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border/40 z-20 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="h-9 w-9 rounded-lg hover:bg-muted shrink-0 cursor-pointer"
              title="Toggle Sidebar"
            >
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={handleNewChat}>
              <div className="h-8.5 w-8.5 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black text-lg shadow-sm shadow-primary/20 select-none">
                C
              </div>
              <span className="font-extrabold text-lg tracking-tight bg-linear-to-r from-foreground to-foreground/80 bg-clip-text text-transparent select-none">
                Civic<span className="text-primary font-black">AI</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 ml-auto">
            {/* New Chat Button */}
            {chatTurns.length > 0 && (
               <Button
                 variant="outline"
                 size="sm"
                 onClick={handleNewChat}
                 className="h-9 rounded-xl text-xs font-bold border-border/50 hover:bg-muted gap-1.5 cursor-pointer px-3"
               >
                 <PlusCircle className="h-4 w-4 text-primary" />
                 {t.newChat}
               </Button>
            )}

            {/* Multilingual Selector */}
            <div className="flex items-center gap-1 bg-muted/40 border border-border/40 px-2.5 py-1.5 rounded-xl shrink-0 select-none">
              <Globe className="h-4 w-4 text-muted-foreground/60 shrink-0" />
              <select
                value={lang}
                onChange={handleLanguageChange}
                className="bg-transparent border-0 text-xs font-bold text-foreground/80 focus:ring-0 focus-visible:ring-0 outline-hidden pr-1 cursor-pointer"
              >
                <option value="en">English (US)</option>
                <option value="es">Español (ES)</option>
                <option value="zh">中文 (ZH)</option>
                <option value="bn">🌐 Bengali (BN)</option>
              </select>
            </div>

            {/* Auth Controls */}
            <div className="flex items-center gap-2 shrink-0">
              {isSignedIn ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSettingsOpen(true)}
                    className="h-9 w-9 rounded-xl hover:bg-muted shrink-0 cursor-pointer"
                    title="Account Settings"
                  >
                    <Settings className="h-4.5 w-4.5 text-muted-foreground/80" />
                  </Button>
                  <div className="hidden sm:flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-1">
                    <Shield className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300 max-w-[100px] truncate">
                      {user.displayName}
                    </span>
                    {user.district && (
                      <span className="text-[10px] text-amber-600/70 dark:text-amber-400/70 font-black font-mono">
                        D{user.district}
                      </span>
                    )}
                  </div>
                  <Button
                    id="sign-out-button"
                    variant="ghost"
                    size="sm"
                    onClick={signOut}
                    className="h-9 px-2.5 text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all gap-1 cursor-pointer rounded-xl"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    {t.signOut}
                  </Button>
                </>
              ) : (
                <Button
                  id="sign-in-button"
                  variant="outline"
                  size="sm"
                  onClick={signIn}
                  className="h-9 px-3 text-xs font-bold gap-1.5 border-border/60 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all cursor-pointer rounded-xl"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  {t.signIn}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative h-[calc(100vh-64px)] overflow-hidden">
        
        {/* LEFT SIDEBAR: Unified Bookmarks and Dynamic Filters */}
        <aside 
          className={`shrink-0 border-r border-border/40 bg-background/50 backdrop-blur-md flex flex-col transition-all duration-300 z-10 ${
            isSidebarOpen ? "w-[280px] p-4 gap-4" : "w-0 p-0 overflow-hidden border-r-0"
          }`}
        >
          {isSidebarOpen && (
            <>
              {isSignedIn ? (
                <>
                  {/* Tabs */}
                  <div className="flex bg-muted/40 p-1 border border-border/30 rounded-xl gap-1 select-none">
                    <Button
                      size="sm"
                      onClick={() => setActiveSidebarTab("history")}
                      variant={activeSidebarTab === "history" ? "secondary" : "ghost"}
                      className="flex-1 text-xs font-bold h-8 rounded-lg cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <History className="h-3.5 w-3.5" />
                      {t.chatHistory}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setActiveSidebarTab("notebook")}
                      variant={activeSidebarTab === "notebook" ? "secondary" : "ghost"}
                      className="flex-1 text-xs font-bold h-8 rounded-lg cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Bookmark className="h-3.5 w-3.5 text-amber-500 fill-amber-500/15" />
                      {t.notebook}
                    </Button>
                  </div>

                  {/* Sidebar Content */}
                  <div className="flex-1 overflow-y-auto pr-0.5 space-y-4">
                    {activeSidebarTab === "history" ? (
                      <ChatHistoryPanel
                        chats={chats}
                        isLoading={isChatsLoading}
                        activeChatId={activeChatId}
                        onSelectChat={handleSelectChat}
                        onDeleteChat={handleDeleteChat}
                      />
                    ) : (
                      <BookmarksPanel
                        bookmarks={bookmarks}
                        isLoading={isBookmarksLoading}
                        onRemoveBookmark={handleNotebookRemove}
                        onSelectBookmark={handleSuggestionClick}
                        apiBaseUrl={API_BASE_URL}
                      />
                    )}
                  </div>
                </>
              ) : (
                /* Unauthenticated Sidebar Prompt */
                <div className="h-full flex flex-col items-center justify-center text-center p-5 space-y-4 border border-dashed border-border/60 rounded-2xl bg-muted/10 my-auto select-none">
                  <User className="h-9 w-9 text-muted-foreground/30 animate-pulse" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-xs text-foreground/80">{t.notebookLocked}</h4>
                    <p className="text-[10px] text-muted-foreground leading-relaxed max-w-[200px]">
                      {t.notebookLockedDesc}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleShowSignInPrompt("access your personal Notebook and Chat History")}
                    className="h-8.5 text-[10px] font-bold rounded-xl gap-1.5 px-4 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/95"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    {t.signIn}
                  </Button>
                </div>
              )}

              {/* Role descriptor */}
              <div className="border-t border-border/30 pt-3 select-none flex items-center gap-2 text-[10px] text-muted-foreground/75 font-semibold mt-auto shrink-0">
                {isSignedIn ? (
                  <Shield className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                ) : (
                  <User className="h-3.5 w-3.5 shrink-0" />
                )}
                <span>
                  {isSignedIn 
                    ? (user.role === "district_aide" ? `${t.districtAideDesc}${user.district}` : t.verifiedCitizen)
                    : t.publicCitizen
                  }
                </span>
              </div>
            </>
          )}
        </aside>

        {/* CENTER COLUMN: Spacious scrolling conversation feed */}
        <main className="flex-1 flex flex-col relative h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto py-6 pb-32 px-4 sm:px-8 space-y-8 h-full scrollbar-thin">
            {chatTurns.length === 0 ? (
              /* Premium Welcome / Onboarding start state */
              <div className="flex flex-col items-center justify-center text-center py-10 sm:py-16 max-w-2xl mx-auto space-y-6 animate-fade-in my-auto h-full">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner select-none">
                  <Sparkles className="h-6 w-6 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-extrabold text-foreground text-2xl tracking-tight">{t.welcomeTitle}</h3>
                  <p className="text-xs text-muted-foreground/80 max-w-md leading-relaxed font-semibold">
                    {t.welcomeSubtitle}
                  </p>
                </div>
                
                {/* Onboarding starting buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full pt-4 min-h-[180px]">
                  {mounted && randomSuggestions.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => handleSuggestionClick(item.q)}
                      className="flex flex-col items-start p-4 text-left rounded-2xl bg-card hover:bg-muted border border-border/30 hover:border-primary/25 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer group shadow-2xs"
                    >
                      <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">{item.label}</span>
                      <span className="text-[10px] text-muted-foreground/85 mt-1 font-semibold leading-normal">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Conversational Turns Feed */
              <div className="space-y-12 max-w-3xl mx-auto w-full">
                {chatTurns.map((turn, tIdx) => {
                  const isLatest = tIdx === chatTurns.length - 1;
                  const displayClusters = turn.clusters;
                  const flatTurnDocs = turn.clusters.flatMap(c => c.documents);
                  
                  return (
                    <div key={turn.id} className="space-y-6 pb-6 border-b border-border/20 last:border-b-0 animate-fade-in">
                      
                      {/* Bold Query Header (No 'Query:' prefix) */}
                      <h2 className="text-lg font-black tracking-tight text-foreground select-text pl-1">
                        {turn.query}
                      </h2>

                      {/* Content Area */}
                      {turn.isLoading ? (
                        /* Skeleton loader for active turn */
                        <div className="space-y-5 pl-1">
                          <div className="flex gap-2 items-center text-xs font-bold text-primary animate-pulse select-none">
                            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                            {t.synthesizing}
                          </div>
                          <div className="space-y-2 animate-pulse pl-1">
                            <div className="h-4 w-full bg-muted rounded-md"></div>
                            <div className="h-4 w-5/6 bg-muted rounded-md"></div>
                            <div className="h-4 w-2/3 bg-muted rounded-md"></div>
                          </div>
                          <div className="grid grid-cols-1 gap-4 pt-2">
                            {[1, 2].map((i) => (
                              <div key={i} className="border border-border/40 rounded-2xl p-5 bg-muted/15 animate-pulse space-y-4">
                                <div className="h-5 w-40 bg-muted rounded-md"></div>
                                <div className="h-4 w-full bg-muted rounded-md"></div>
                                <div className="flex gap-2 pt-2">
                                  <div className="h-7 w-20 bg-muted rounded-lg"></div>
                                  <div className="h-7 w-20 bg-muted rounded-lg"></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : turn.error ? (
                        /* Connection error card */
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl p-4 flex gap-3 items-start pl-1">
                          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-bold">{t.executionFailed}</h4>
                            <p className="font-semibold text-destructive/90 leading-relaxed mt-0.5">{turn.error}</p>
                          </div>
                        </div>
                      ) : (
                        /* Successful Turn Response - 1-2-3 Layout */
                        <div className="space-y-5">
                          
                          {/* 1. Synthesis Typewriter summary (runs typewriter on mount if it's the latest active turn) */}
                          <div className="space-y-2 pl-1 bg-card/30 border border-border/30 rounded-2xl p-4.5 shadow-3xs">
                            <div className="flex items-center gap-1.5 text-xs font-black text-primary select-none mb-1">
                              <Sparkles className="h-4 w-4 animate-pulse" />
                              {t.agentTitle}
                            </div>
                            {isLatest && !animatedTurnIds.has(turn.id) && !turn.error ? (
                              <TypewriterSynthesis
                                synthesis={turn.synthesis}
                                results={flatTurnDocs}
                                onCitationHover={setHoveredCitationIndex}
                                onComplete={() => handleCompleteAnimation(turn.id)}
                              />
                            ) : (
                              /* Render flat citations immediately for completed past turns to save CPU and visual stutter */
                              <div className="text-sm leading-relaxed text-foreground/85 font-normal break-words">
                                {turn.synthesis.split(/(\[\d+\])/g).map((part, pIdx) => {
                                  const match = part.match(/^\[(\d+)\]$/);
                                  if (match) {
                                    const docIdx = parseInt(match[1], 10) - 1;
                                    const targetDoc = flatTurnDocs.find(d => d.citation_index === docIdx + 1);
                                    if (targetDoc?.document_url) {
                                      return (
                                        <a
                                          key={pIdx}
                                          href={targetDoc.document_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex mx-0.5 bg-primary/10 hover:bg-primary hover:text-primary-foreground font-mono text-xs font-bold text-primary px-1 rounded border border-primary/25 transition-all"
                                          onMouseEnter={() => setHoveredCitationIndex(docIdx)}
                                          onMouseLeave={() => setHoveredCitationIndex(null)}
                                        >
                                          {part}
                                        </a>
                                      );
                                    }
                                    return (
                                      <span
                                        key={pIdx}
                                        className="inline-flex mx-0.5 font-mono text-xs font-bold text-primary bg-primary/10 px-1 rounded border border-primary/25"
                                        onMouseEnter={() => setHoveredCitationIndex(docIdx)}
                                        onMouseLeave={() => setHoveredCitationIndex(null)}
                                      >
                                        {part}
                                      </span>
                                    );
                                  }
                                  return <span key={pIdx}>{part}</span>;
                                })}
                              </div>
                            )}
                          </div>

                          {/* 2. Grouped Document Panels (Max 3, filtered dynamically if it's the active turn) */}
                          {(animatedTurnIds.has(turn.id) || !isLatest) && (
                            <div className="space-y-4 pt-1 animate-fade-in">
                              {displayClusters.length === 0 ? (
                                <div className="text-center py-8 p-4 bg-muted/25 rounded-2xl border border-dashed border-border/50 text-xs text-muted-foreground/80 font-semibold select-none pl-1">
                                  {t.noClusters}
                                </div>
                              ) : (
                                /* Render at most 3 panels if results exist */
                                <div className="flex flex-col gap-4">
                                  {displayClusters.slice(0, 3).map((cluster, cIdx) => (
                                    <ResultCard
                                      key={cIdx}
                                      cluster={cluster}
                                      clusterIndex={cIdx}
                                      hoveredCitationIndex={hoveredCitationIndex}
                                      onCitationHover={setHoveredCitationIndex}
                                      isSignedIn={isSignedIn}
                                      bookmarks={bookmarks}
                                      onBookmark={handleBookmark}
                                      onUnbookmark={handleUnbookmark}
                                      onShowSignInPrompt={handleShowSignInPrompt}
                                    />
                                  ))}
                                  {displayClusters.length > 3 && (
                                    <p className="text-[10px] text-muted-foreground/60 italic font-medium select-none pl-1">
                                      {t.redundantClusters}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {(animatedTurnIds.has(turn.id) || !isLatest) && turn.relatedQueries && turn.relatedQueries.length > 0 && (
                            <div className="pt-2 pl-1 space-y-2 animate-fade-in">
                              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block select-none">
                                {t.followups}
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {turn.relatedQueries.map((q, qIdx) => (
                                  <button
                                    key={qIdx}
                                    onClick={() => handleSuggestionClick(q)}
                                    className="px-3.5 py-2 text-xs rounded-xl bg-muted/60 border border-border/30 text-muted-foreground hover:text-foreground hover:bg-muted font-bold transition-all cursor-pointer active:scale-95 shadow-3xs"
                                  >
                                    {q}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Sticky Bottom Glassmorphism Search Input Bar */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background/95 to-transparent z-10 border-t-0">
            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto relative flex items-center shadow-lg rounded-full bg-background/70 border border-border/50 backdrop-blur-md px-2 py-1.5 focus-within:ring-2 focus-visible:ring-primary/40 focus-within:border-primary/50 transition-all">
              <Search className="h-5 w-5 ml-3.5 text-muted-foreground/60 shrink-0" />
              <Input
                id="search-input"
                type="text"
                placeholder={isChatWorking ? t.pleaseWait : t.bottomInputPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isChatWorking}
                className="border-0 bg-transparent h-11 w-full pl-2 pr-12 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm font-semibold text-foreground/90 placeholder:text-muted-foreground/60 shadow-none outline-hidden disabled:cursor-not-allowed"
              />
              {isChatWorking ? (
                <Button 
                  type="button" 
                  onClick={handleStopSearch}
                  className="h-10 w-10 p-0 rounded-full bg-destructive text-destructive-foreground shadow-sm shadow-destructive/20 hover:scale-105 active:scale-95 cursor-pointer shrink-0 transition-all flex items-center justify-center ml-auto"
                  title={t.stopGenerating}
                >
                  <Square className="h-4 w-4 fill-current shrink-0" />
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={!query.trim()} 
                  className="h-10 w-10 p-0 rounded-full bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:scale-105 active:scale-95 cursor-pointer shrink-0 transition-all flex items-center justify-center ml-auto"
                  title={t.sendMessage}
                >
                  <ArrowRight className="h-4.5 w-4.5 shrink-0" />
                </Button>
              )}
            </form>
            <p className="text-center text-[10px] text-muted-foreground/50 font-semibold mt-2.5 select-none">
              {t.footerText}
            </p>
          </div>
        </main>
      </div>

      {/* SECURE AUTHENTICATION CTA MODAL */}
      {showSignInModal && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card border border-border/80 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowSignInModal(false)}
              className="absolute top-4 right-4 text-muted-foreground/60 hover:text-foreground cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <Bookmark className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black tracking-tight">Unlock Secure Research Notebook</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                To {signInPromptReason}, please sign in with your Google account. Your research notebook, customized annotations, and chat history will be automatically saved to Google Cloud.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={() => {
                  setShowSignInModal(false);
                  signIn();
                }}
                className="w-full bg-primary hover:bg-primary/95 text-primary-foreground h-11 font-bold rounded-xl gap-2 cursor-pointer"
              >
                <LogIn className="h-4.5 w-4.5" />
                Sign In with Google
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowSignInModal(false)}
                className="w-full h-10 text-xs font-semibold text-muted-foreground cursor-pointer"
              >
                Continue Browsing Anonymously
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ACCOUNT SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-card border border-border/85 rounded-2xl w-full max-w-md p-6 shadow-2xl relative my-8 space-y-4">
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground/60 hover:text-foreground cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col items-center text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary relative select-none">
                <Settings className="h-6 w-6 animate-spin-slow text-primary/90" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-base font-black tracking-tight">{t.settingsTitle}</h3>
                <p className="text-[10px] text-muted-foreground font-semibold">
                  {t.settingsSubtitle}
                </p>
              </div>
            </div>

            <div className="space-y-4 border-t border-border/30 pt-4">
              {/* Profile Details (Editable Name & Static Email/Role) */}
              <div className="space-y-3">
                {/* Editable Full Name field */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">
                    {t.fullName}
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="h-9 text-xs rounded-xl bg-muted/20 border-border/40 focus-visible:ring-primary font-bold"
                    />
                    <Button
                      size="sm"
                      disabled={isUpdatingName || editedName.trim() === "" || editedName === user?.displayName}
                      onClick={async () => {
                        setIsUpdatingName(true);
                        try {
                          await updateProfileName(editedName);
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setIsUpdatingName(false);
                        }
                      }}
                      className="h-9 rounded-xl text-xs font-bold px-3 shrink-0 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/95"
                    >
                      {isUpdatingName ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          {t.updatingName}
                        </>
                      ) : (
                        t.updateName
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/20 border border-border/30">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{t.emailAddress}</span>
                  <span className="text-xs font-bold text-foreground max-w-[200px] truncate">{user?.email || "N/A"}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/20 border border-border/30">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{t.verifiedRole}</span>
                  <Badge variant="outline" className="text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 px-2.5 py-0.5">
                    {user?.role === "district_aide" ? t.districtAide : t.verifiedCitizen}
                  </Badge>
                </div>

                {user?.district && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/20 border border-border/30">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{t.districtCoverage}</span>
                    <span className="text-xs font-mono font-black text-primary">District {user.district}</span>
                  </div>
                )}
              </div>

              {/* Security/Cloud Sync Info */}
              <div className="p-3 bg-green-500/5 border border-green-500/10 rounded-xl space-y-0.5 text-center select-none">
                <p className="text-[10px] font-bold text-green-700 dark:text-green-400 flex items-center justify-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t.cloudSyncActive}
                </p>
                <p className="text-[9px] text-muted-foreground font-medium leading-normal">
                  {t.cloudSyncDesc}
                </p>
              </div>

              {/* Danger Zone Block */}
              <div className="border-t border-border/30 pt-3.5 mt-3.5 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-red-600 dark:text-red-400 select-none">
                  <AlertCircle className="h-4 w-4" />
                  {t.dangerZone}
                </div>
                <p className="text-[10px] text-muted-foreground leading-normal font-semibold">
                  {t.dangerZoneDesc}
                </p>
                
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-wide block">
                    {t.typeDeleteToConfirm}
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder={t.deletePlaceholder}
                      className="h-9 text-xs rounded-xl bg-destructive/5 border-destructive/20 focus-visible:ring-destructive font-bold placeholder:text-muted-foreground/50"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={isDeletingAccount || deleteConfirmText !== "DELETE"}
                      onClick={async () => {
                        setIsDeletingAccount(true);
                        setDeleteError("");
                        try {
                          await deleteAccount();
                          setIsSettingsOpen(false);
                        } catch (err: any) {
                          console.error(err);
                          setDeleteError("Failed to delete account. Please try again.");
                        } finally {
                          setIsDeletingAccount(false);
                        }
                      }}
                      className="h-9 rounded-xl text-xs font-bold px-3 shrink-0 cursor-pointer bg-red-600 hover:bg-red-700 text-white"
                    >
                      {isDeletingAccount ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          {t.deletingButton}
                        </>
                      ) : (
                        t.deleteButton
                      )}
                    </Button>
                  </div>
                  {deleteError && (
                    <p className="text-[10px] text-red-500 font-bold mt-1">
                      {deleteError}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                onClick={() => setIsSettingsOpen(false)}
                className="w-full bg-primary hover:bg-primary/95 text-primary-foreground h-10 font-bold rounded-xl cursor-pointer text-xs"
              >
                {t.closeSettings}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
