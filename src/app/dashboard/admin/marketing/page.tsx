"use client";

import { useState } from "react";
import { 
  Plus, 
  MessageSquare, 
  Facebook, 
  Instagram,
  TrendingUp, 
  Users, 
  Calendar,
  Target,
  BarChart3,
  Eye,
  Edit,
  Trash2,
  Play,
  Pause,
  Heart,
  Share2,
  ThumbsUp
} from "lucide-react";

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState("campaigns");

  // Datos de ejemplo para campañas Meta
  const campaigns = [
    {
      id: 1,
      name: "Lanzamiento Proyecto Residencial",
      type: "whatsapp",
      status: "active",
      sent: 1250,
      delivered: 1180,
      opened: 890,
      replied: 234,
      conversion: 45,
      created: "2024-01-15",
      scheduled: "2024-01-20"
    },
    {
      id: 2,
      name: "Promoción Facebook - Descuentos",
      type: "facebook",
      status: "active",
      sent: 0,
      delivered: 0,
      opened: 0,
      replied: 0,
      conversion: 0,
      reach: 5420,
      engagement: 890,
      clicks: 234,
      created: "2024-01-18",
      scheduled: "2024-01-25"
    },
    {
      id: 3,
      name: "Stories Instagram - Nuevas Propiedades",
      type: "instagram",
      status: "scheduled",
      sent: 0,
      delivered: 0,
      opened: 0,
      replied: 0,
      conversion: 0,
      reach: 0,
      engagement: 0,
      clicks: 0,
      created: "2024-01-20",
      scheduled: "2024-01-28"
    }
  ];

  const campaignStats = [
    {
      title: "Campañas Meta Activas",
      value: "3",
      change: "+2",
      type: "positive",
      icon: Play,
      color: "text-crm-success",
      bgColor: "bg-crm-success bg-opacity-10"
    },
    {
      title: "Alcance Total",
      value: "12.4K",
      change: "+2.1K",
      type: "positive",
      icon: Eye,
      color: "text-crm-info",
      bgColor: "bg-crm-info bg-opacity-10"
    },
    {
      title: "Engagement Rate",
      value: "8.2%",
      change: "+1.3%",
      type: "positive",
      icon: Heart,
      color: "text-crm-primary",
      bgColor: "bg-crm-primary bg-opacity-10"
    },
    {
      title: "Conversiones",
      value: "45",
      change: "+12",
      type: "positive",
      icon: Target,
      color: "text-crm-accent",
      bgColor: "bg-crm-accent bg-opacity-10"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 border border-green-200";
      case "scheduled": return "bg-blue-100 text-blue-800 border border-blue-200";
      case "draft": return "bg-gray-100 text-gray-800 border border-gray-200";
      case "paused": return "bg-yellow-100 text-yellow-800 border border-yellow-200";
      default: return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active": return "Activa";
      case "scheduled": return "Programada";
      case "draft": return "Borrador";
      case "paused": return "Pausada";
      default: return status;
    }
  };

  // Componente de icono de WhatsApp personalizado
  const WhatsAppIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
    </svg>
  );

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "whatsapp": return WhatsAppIcon;
      case "facebook": return Facebook;
      case "instagram": return Instagram;
      default: return MessageSquare;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "whatsapp": return "text-green-600";
      case "facebook": return "text-blue-600";
      case "instagram": return "text-pink-600";
      default: return "text-crm-text-muted";
    }
  };

  const getTypeBgColor = (type: string) => {
    switch (type) {
      case "whatsapp": return "bg-crm-card border-crm-border hover:border-green-300";
      case "facebook": return "bg-crm-card border-crm-border hover:border-blue-300";
      case "instagram": return "bg-crm-card border-crm-border hover:border-pink-300";
      default: return "bg-crm-card border-crm-border";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-crm-text-primary font-display flex items-center gap-3">
            <div className="p-2 bg-crm-primary rounded-xl">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            Marketing Meta
          </h1>
          <p className="text-crm-text-secondary mt-1">
            Gestiona campañas en WhatsApp, Facebook e Instagram con plantillas prediseñadas
          </p>
        </div>
        
        <button className="flex items-center gap-2 px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover transition-all duration-200 shadow-crm">
          <Plus className="w-4 h-4" />
          Nueva Campaña Meta
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {campaignStats.map((stat, index) => (
          <div key={index} className="bg-crm-card border border-crm-border rounded-xl p-6 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-crm-text-secondary">
                {stat.title}
              </h3>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-crm-text-primary mb-1">{stat.value}</div>
            <p className={`text-xs ${
              stat.type === "positive" ? "text-green-600" : "text-red-600"
            }`}>
              {stat.change} vs mes anterior
            </p>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="bg-crm-card border border-crm-border rounded-xl p-6">
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-crm-border pb-4">
          {[
            { id: "campaigns", label: "Campañas Meta", icon: BarChart3 },
            { id: "templates", label: "Plantillas", icon: Edit },
            { id: "audiences", label: "Audiencias", icon: Users },
            { id: "analytics", label: "Analytics", icon: TrendingUp }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-crm-primary text-white'
                  : 'bg-crm-card-hover text-crm-text-primary hover:bg-crm-sidebar-hover'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "campaigns" && (
          <div className="space-y-6">
            {/* Campaign List */}
            <div className="space-y-4">
              {campaigns.map((campaign) => {
                const TypeIcon = getTypeIcon(campaign.type);
                const openRate = campaign.sent > 0 ? ((campaign.opened / campaign.sent) * 100).toFixed(1) : "0";
                const replyRate = campaign.opened > 0 ? ((campaign.replied / campaign.opened) * 100).toFixed(1) : "0";
                const engagementRate = campaign.reach > 0 ? ((campaign.engagement / campaign.reach) * 100).toFixed(1) : "0";
                
                return (
                  <div key={campaign.id} className={`border rounded-xl p-6 hover:shadow-md transition-all duration-200 ${getTypeBgColor(campaign.type)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl bg-crm-card border border-crm-border shadow-crm`}>
                          <TypeIcon className={`w-6 h-6 ${getTypeColor(campaign.type)}`} />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-crm-text-primary">
                              {campaign.name}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                              {getStatusText(campaign.status)}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            {campaign.type === "whatsapp" ? (
                              <>
                                <div>
                                  <p className="text-sm text-crm-text-secondary">Enviados</p>
                                  <p className="font-semibold text-crm-text-primary">{campaign.sent.toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-crm-text-secondary">Entregados</p>
                                  <p className="font-semibold text-crm-text-primary">{campaign.delivered.toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-crm-text-secondary">Leídos</p>
                                  <p className="font-semibold text-crm-text-primary">{openRate}%</p>
                                </div>
                                <div>
                                  <p className="text-sm text-crm-text-secondary">Respuestas</p>
                                  <p className="font-semibold text-crm-text-primary">{replyRate}%</p>
                                </div>
                              </>
                            ) : (
                              <>
                                <div>
                                  <p className="text-sm text-crm-text-secondary">Alcance</p>
                                  <p className="font-semibold text-crm-text-primary">{campaign.reach?.toLocaleString() || "0"}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-crm-text-secondary">Engagement</p>
                                  <p className="font-semibold text-crm-text-primary">{engagementRate}%</p>
                                </div>
                                <div>
                                  <p className="text-sm text-crm-text-secondary">Clics</p>
                                  <p className="font-semibold text-crm-text-primary">{campaign.clicks || 0}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-crm-text-secondary">Conversiones</p>
                                  <p className="font-semibold text-crm-text-primary">{campaign.conversion}</p>
                                </div>
                              </>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-crm-text-secondary">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              Creada: {new Date(campaign.created).toLocaleDateString()}
                            </div>
                            {campaign.scheduled && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                Programada: {new Date(campaign.scheduled).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button className="p-2 text-crm-text-secondary hover:text-crm-text-primary hover:bg-crm-card-hover rounded-lg transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-crm-text-secondary hover:text-crm-text-primary hover:bg-crm-card-hover rounded-lg transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-crm-text-secondary hover:text-crm-text-primary hover:bg-crm-card-hover rounded-lg transition-colors">
                          {campaign.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <button className="p-2 text-crm-danger hover:text-crm-danger hover:bg-crm-danger hover:bg-opacity-10 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-crm-border">
              <button className="p-6 border-2 border-dashed border-crm-border rounded-xl hover:border-green-300 hover:bg-green-50 transition-all duration-200 group">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-green-100 rounded-2xl group-hover:bg-green-200 transition-colors">
                    <WhatsAppIcon className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-semibold text-crm-text-primary text-lg">WhatsApp Business</h4>
                    <p className="text-sm text-crm-text-secondary mt-1">Mensajes directos con plantillas</p>
                  </div>
                </div>
              </button>

              <button className="p-6 border-2 border-dashed border-crm-border rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-blue-100 rounded-2xl group-hover:bg-blue-200 transition-colors">
                    <Facebook className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-semibold text-crm-text-primary text-lg">Facebook Ads</h4>
                    <p className="text-sm text-crm-text-secondary mt-1">Anuncios y posts promocionales</p>
                  </div>
                </div>
              </button>

              <button className="p-6 border-2 border-dashed border-crm-border rounded-xl hover:border-pink-300 hover:bg-pink-50 transition-all duration-200 group">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-pink-100 rounded-2xl group-hover:bg-pink-200 transition-colors">
                    <Instagram className="w-8 h-8 text-pink-600" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-semibold text-crm-text-primary text-lg">Instagram</h4>
                    <p className="text-sm text-crm-text-secondary mt-1">Stories, posts y reels</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Other tabs content */}
        {activeTab === "templates" && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <Edit className="w-16 h-16 mx-auto mb-4 text-crm-text-muted" />
              <h3 className="text-2xl font-semibold text-crm-text-primary mb-2">
                Plantillas Prediseñadas
              </h3>
              <p className="text-crm-text-secondary mb-6">
                Plantillas profesionales para WhatsApp, Facebook e Instagram
              </p>
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* WhatsApp Templates */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <WhatsAppIcon className="w-5 h-5 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-crm-text-primary">WhatsApp</h4>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-crm-card rounded-lg border border-crm-border">
                    <p className="text-sm font-medium text-crm-text-primary">Recordatorio de Cita</p>
                    <p className="text-xs text-crm-text-secondary">Template para recordar citas</p>
                  </div>
                  <div className="p-3 bg-crm-card rounded-lg border border-crm-border">
                    <p className="text-sm font-medium text-crm-text-primary">Nueva Propiedad</p>
                    <p className="text-xs text-crm-text-secondary">Anuncio de propiedades nuevas</p>
                  </div>
                  <div className="p-3 bg-crm-card rounded-lg border border-crm-border">
                    <p className="text-sm font-medium text-crm-text-primary">Seguimiento Post-Visita</p>
                    <p className="text-xs text-crm-text-secondary">Follow-up después de visitas</p>
                  </div>
                </div>
              </div>

              {/* Facebook Templates */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Facebook className="w-5 h-5 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-crm-text-primary">Facebook</h4>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-crm-card rounded-lg border border-crm-border">
                    <p className="text-sm font-medium text-crm-text-primary">Anuncio Promocional</p>
                    <p className="text-xs text-crm-text-secondary">Descuentos y ofertas especiales</p>
                  </div>
                  <div className="p-3 bg-crm-card rounded-lg border border-crm-border">
                    <p className="text-sm font-medium text-crm-text-primary">Testimonial Cliente</p>
                    <p className="text-xs text-crm-text-secondary">Reseñas y testimonios</p>
                  </div>
                  <div className="p-3 bg-crm-card rounded-lg border border-crm-border">
                    <p className="text-sm font-medium text-crm-text-primary">Proyecto Destacado</p>
                    <p className="text-xs text-crm-text-secondary">Showcase de propiedades</p>
                  </div>
                </div>
              </div>

              {/* Instagram Templates */}
              <div className="bg-pink-50 border border-pink-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-pink-100 rounded-lg">
                    <Instagram className="w-5 h-5 text-pink-600" />
                  </div>
                  <h4 className="font-semibold text-crm-text-primary">Instagram</h4>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-crm-card rounded-lg border border-crm-border">
                    <p className="text-sm font-medium text-crm-text-primary">Story Promocional</p>
                    <p className="text-xs text-crm-text-secondary">Stories con descuentos</p>
                  </div>
                  <div className="p-3 bg-crm-card rounded-lg border border-crm-border">
                    <p className="text-sm font-medium text-crm-text-primary">Reel de Propiedad</p>
                    <p className="text-xs text-crm-text-secondary">Tours virtuales cortos</p>
                  </div>
                  <div className="p-3 bg-crm-card rounded-lg border border-crm-border">
                    <p className="text-sm font-medium text-crm-text-primary">Post Inspiracional</p>
                    <p className="text-xs text-crm-text-secondary">Contenido motivacional</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center pt-6">
              <button className="flex items-center gap-2 px-6 py-3 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover transition-all duration-200 shadow-crm mx-auto">
                <Plus className="w-5 h-5" />
                Crear Nueva Plantilla
              </button>
            </div>
          </div>
        )}

        {activeTab === "audiences" && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <Users className="w-16 h-16 mx-auto mb-4 text-crm-text-muted" />
              <h3 className="text-2xl font-semibold text-crm-text-primary mb-2">
                Segmentación de Audiencias Meta
              </h3>
              <p className="text-crm-text-secondary mb-6">
                Crea audiencias personalizadas para WhatsApp, Facebook e Instagram
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-crm-card border border-crm-border rounded-xl p-6">
                <h4 className="font-semibold text-crm-text-primary mb-4">Audiencias por Demografía</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-crm-card-hover rounded-lg">
                    <span className="text-sm text-crm-text-secondary">Edad 25-45</span>
                    <span className="text-sm font-medium text-crm-text-primary">2,450 personas</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-crm-card-hover rounded-lg">
                    <span className="text-sm text-crm-text-secondary">Ingresos Altos</span>
                    <span className="text-sm font-medium text-crm-text-primary">1,230 personas</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-crm-card-hover rounded-lg">
                    <span className="text-sm text-crm-text-secondary">Interés en Bienes Raíces</span>
                    <span className="text-sm font-medium text-crm-text-primary">3,890 personas</span>
                  </div>
                </div>
              </div>

              <div className="bg-crm-card border border-crm-border rounded-xl p-6">
                <h4 className="font-semibold text-crm-text-primary mb-4">Audiencias por Comportamiento</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-crm-card-hover rounded-lg">
                    <span className="text-sm text-crm-text-secondary">Visitó el sitio web</span>
                    <span className="text-sm font-medium text-crm-text-primary">890 personas</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-crm-card-hover rounded-lg">
                    <span className="text-sm text-crm-text-secondary">Interactuó en WhatsApp</span>
                    <span className="text-sm font-medium text-crm-text-primary">456 personas</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-crm-card-hover rounded-lg">
                    <span className="text-sm text-crm-text-secondary">Engagement en Facebook</span>
                    <span className="text-sm font-medium text-crm-text-primary">1,234 personas</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <button className="flex items-center gap-2 px-6 py-3 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover transition-all duration-200 shadow-crm mx-auto">
                <Plus className="w-5 h-5" />
                Crear Nueva Audiencia
              </button>
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <TrendingUp className="w-16 h-16 mx-auto mb-4 text-crm-text-muted" />
              <h3 className="text-2xl font-semibold text-crm-text-primary mb-2">
                Analytics Meta
              </h3>
              <p className="text-crm-text-secondary mb-6">
                Análisis detallado del rendimiento en todas las plataformas Meta
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-crm-card border border-crm-border rounded-xl p-6">
                <h4 className="font-semibold text-crm-text-primary mb-4 flex items-center gap-2">
                  <WhatsAppIcon className="w-5 h-5 text-green-600" />
                  WhatsApp Performance
                </h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-crm-text-secondary">Tasa de Entrega</span>
                    <span className="text-sm font-medium text-crm-text-primary">94.4%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-crm-text-secondary">Tasa de Lectura</span>
                    <span className="text-sm font-medium text-crm-text-primary">71.2%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-crm-text-secondary">Tasa de Respuesta</span>
                    <span className="text-sm font-medium text-crm-text-primary">26.3%</span>
                  </div>
                </div>
              </div>

              <div className="bg-crm-card border border-crm-border rounded-xl p-6">
                <h4 className="font-semibold text-crm-text-primary mb-4 flex items-center gap-2">
                  <Facebook className="w-5 h-5 text-blue-600" />
                  Facebook & Instagram Reach
                </h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-crm-text-secondary">Alcance Total</span>
                    <span className="text-sm font-medium text-crm-text-primary">12.4K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-crm-text-secondary">Engagement Rate</span>
                    <span className="text-sm font-medium text-crm-text-primary">8.2%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-crm-text-secondary">CTR Promedio</span>
                    <span className="text-sm font-medium text-crm-text-primary">2.4%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <button className="flex items-center gap-2 px-6 py-3 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover transition-all duration-200 shadow-crm mx-auto">
                <TrendingUp className="w-5 h-5" />
                Ver Reporte Completo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}