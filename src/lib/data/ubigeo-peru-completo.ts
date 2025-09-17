// Datos completos de ubicaciones de Perú
// Incluye todos los departamentos, provincias y distritos

export interface UbigeoData {
  departamentos: Array<{
    codigo: string;
    nombre: string;
    provincias: Array<{
      codigo: string;
      nombre: string;
      distritos: Array<{
        codigo: string;
        nombre: string;
      }>;
    }>;
  }>;
}

export const UBIGEO_PERU_COMPLETO: UbigeoData = {
  departamentos: [
    {
      codigo: "01",
      nombre: "Amazonas",
      provincias: [
        {
          codigo: "0101",
          nombre: "Chachapoyas",
          distritos: [
            { codigo: "010101", nombre: "Chachapoyas" },
            { codigo: "010102", nombre: "Asunción" },
            { codigo: "010103", nombre: "Balsas" },
            { codigo: "010104", nombre: "Cheto" },
            { codigo: "010105", nombre: "Chiliquin" },
            { codigo: "010106", nombre: "Chuquibamba" },
            { codigo: "010107", nombre: "Granada" },
            { codigo: "010108", nombre: "Huancas" },
            { codigo: "010109", nombre: "La Jalca" },
            { codigo: "010110", nombre: "Leimebamba" },
            { codigo: "010111", nombre: "Levanto" },
            { codigo: "010112", nombre: "Magdalena" },
            { codigo: "010113", nombre: "Mariscal Castilla" },
            { codigo: "010114", nombre: "Molinopampa" },
            { codigo: "010115", nombre: "Montevideo" },
            { codigo: "010116", nombre: "Olleros" },
            { codigo: "010117", nombre: "Quinjalca" },
            { codigo: "010118", nombre: "San Francisco de Daguas" },
            { codigo: "010119", nombre: "San Isidro de Maino" },
            { codigo: "010120", nombre: "Soloco" },
            { codigo: "010121", nombre: "Sonche" }
          ]
        },
        {
          codigo: "0102",
          nombre: "Bagua",
          distritos: [
            { codigo: "010201", nombre: "Bagua" },
            { codigo: "010202", nombre: "Aramango" },
            { codigo: "010203", nombre: "Copallin" },
            { codigo: "010204", nombre: "El Parco" },
            { codigo: "010205", nombre: "Imaza" },
            { codigo: "010206", nombre: "La Peca" }
          ]
        },
        {
          codigo: "0103",
          nombre: "Bongará",
          distritos: [
            { codigo: "010301", nombre: "Jumbilla" },
            { codigo: "010302", nombre: "Chisquilla" },
            { codigo: "010303", nombre: "Churuja" },
            { codigo: "010304", nombre: "Corosha" },
            { codigo: "010305", nombre: "Cuispes" },
            { codigo: "010306", nombre: "Florida" },
            { codigo: "010307", nombre: "Jazan" },
            { codigo: "010308", nombre: "Recta" },
            { codigo: "010309", nombre: "San Carlos" },
            { codigo: "010310", nombre: "Shipasbamba" },
            { codigo: "010311", nombre: "Valera" },
            { codigo: "010312", nombre: "Yambrasbamba" }
          ]
        },
        {
          codigo: "0104",
          nombre: "Condorcanqui",
          distritos: [
            { codigo: "010401", nombre: "Nieva" },
            { codigo: "010402", nombre: "El Cenepa" },
            { codigo: "010403", nombre: "Río Santiago" }
          ]
        },
        {
          codigo: "0105",
          nombre: "Luya",
          distritos: [
            { codigo: "010501", nombre: "Lámud" },
            { codigo: "010502", nombre: "Camporredondo" },
            { codigo: "010503", nombre: "Cocabamba" },
            { codigo: "010504", nombre: "Colcamar" },
            { codigo: "010505", nombre: "Conila" },
            { codigo: "010506", nombre: "Inguilpata" },
            { codigo: "010507", nombre: "Longuita" },
            { codigo: "010508", nombre: "Lonya Chico" },
            { codigo: "010509", nombre: "Luya" },
            { codigo: "010510", nombre: "Luya Viejo" },
            { codigo: "010511", nombre: "María" },
            { codigo: "010512", nombre: "Ocalli" },
            { codigo: "010513", nombre: "Ocumal" },
            { codigo: "010514", nombre: "Pisuquia" },
            { codigo: "010515", nombre: "Providencia" },
            { codigo: "010516", nombre: "San Cristóbal" },
            { codigo: "010517", nombre: "San Francisco de Yeso" },
            { codigo: "010518", nombre: "San Jerónimo" },
            { codigo: "010519", nombre: "San Juan de Lopecancha" },
            { codigo: "010520", nombre: "Santa Catalina" },
            { codigo: "010521", nombre: "Santo Tomas" },
            { codigo: "010522", nombre: "Tingo" },
            { codigo: "010523", nombre: "Trita" }
          ]
        },
        {
          codigo: "0106",
          nombre: "Rodríguez de Mendoza",
          distritos: [
            { codigo: "010601", nombre: "San Nicolás" },
            { codigo: "010602", nombre: "Chirimoto" },
            { codigo: "010603", nombre: "Cochamal" },
            { codigo: "010604", nombre: "Huambo" },
            { codigo: "010605", nombre: "Limabamba" },
            { codigo: "010606", nombre: "Longar" },
            { codigo: "010607", nombre: "Mariscal Benavides" },
            { codigo: "010608", nombre: "Milpuc" },
            { codigo: "010609", nombre: "Omia" },
            { codigo: "010610", nombre: "Santa Rosa" },
            { codigo: "010611", nombre: "Totora" },
            { codigo: "010612", nombre: "Vista Alegre" }
          ]
        },
        {
          codigo: "0107",
          nombre: "Utcubamba",
          distritos: [
            { codigo: "010701", nombre: "Bagua Grande" },
            { codigo: "010702", nombre: "Cajaruro" },
            { codigo: "010703", nombre: "Cumba" },
            { codigo: "010704", nombre: "El Milagro" },
            { codigo: "010705", nombre: "Jamalca" },
            { codigo: "010706", nombre: "Lonya Grande" },
            { codigo: "010707", nombre: "Yamon" }
          ]
        }
      ]
    },
    {
      codigo: "02",
      nombre: "Áncash",
      provincias: [
        {
          codigo: "0201",
          nombre: "Huaraz",
          distritos: [
            { codigo: "020101", nombre: "Huaraz" },
            { codigo: "020102", nombre: "Cochabamba" },
            { codigo: "020103", nombre: "Colcabamba" },
            { codigo: "020104", nombre: "Huanchay" },
            { codigo: "020105", nombre: "Independencia" },
            { codigo: "020106", nombre: "Jangas" },
            { codigo: "020107", nombre: "La Libertad" },
            { codigo: "020108", nombre: "Olleros" },
            { codigo: "020109", nombre: "Pampas Grande" },
            { codigo: "020110", nombre: "Pariacoto" },
            { codigo: "020111", nombre: "Pira" },
            { codigo: "020112", nombre: "Tarica" }
          ]
        },
        {
          codigo: "0202",
          nombre: "Aija",
          distritos: [
            { codigo: "020201", nombre: "Aija" },
            { codigo: "020202", nombre: "Coris" },
            { codigo: "020203", nombre: "Huacllan" },
            { codigo: "020204", nombre: "La Merced" },
            { codigo: "020205", nombre: "Succha" }
          ]
        },
        {
          codigo: "0203",
          nombre: "Antonio Raimondi",
          distritos: [
            { codigo: "020301", nombre: "Llamellin" },
            { codigo: "020302", nombre: "Aczo" },
            { codigo: "020303", nombre: "Chaccho" },
            { codigo: "020304", nombre: "Chingas" },
            { codigo: "020305", nombre: "Mirgas" },
            { codigo: "020306", nombre: "San Juan de Rontoy" }
          ]
        },
        {
          codigo: "0204",
          nombre: "Asunción",
          distritos: [
            { codigo: "020401", nombre: "Chacas" },
            { codigo: "020402", nombre: "Acochaca" }
          ]
        },
        {
          codigo: "0205",
          nombre: "Bolognesi",
          distritos: [
            { codigo: "020501", nombre: "Chiquian" },
            { codigo: "020502", nombre: "Abelardo Pardo Lezameta" },
            { codigo: "020503", nombre: "Antonio Raymondi" },
            { codigo: "020504", nombre: "Aquia" },
            { codigo: "020505", nombre: "Cajacay" },
            { codigo: "020506", nombre: "Canis" },
            { codigo: "020507", nombre: "Colquioc" },
            { codigo: "020508", nombre: "Huallanca" },
            { codigo: "020509", nombre: "Huasta" },
            { codigo: "020510", nombre: "Huayllacayan" },
            { codigo: "020511", nombre: "La Primavera" },
            { codigo: "020512", nombre: "Mangas" },
            { codigo: "020513", nombre: "Pacllon" },
            { codigo: "020514", nombre: "San Miguel de Corpanqui" },
            { codigo: "020515", nombre: "Ticllos" }
          ]
        },
        {
          codigo: "0206",
          nombre: "Carhuaz",
          distritos: [
            { codigo: "020601", nombre: "Carhuaz" },
            { codigo: "020602", nombre: "Acopampa" },
            { codigo: "020603", nombre: "Amashca" },
            { codigo: "020604", nombre: "Anta" },
            { codigo: "020605", nombre: "Ataquero" },
            { codigo: "020606", nombre: "Marcara" },
            { codigo: "020607", nombre: "Pariahuanca" },
            { codigo: "020608", nombre: "San Miguel de Aco" },
            { codigo: "020609", nombre: "Shilla" },
            { codigo: "020610", nombre: "Tinco" },
            { codigo: "020611", nombre: "Yungar" }
          ]
        },
        {
          codigo: "0207",
          nombre: "Carlos Fermín Fitzcarrald",
          distritos: [
            { codigo: "020701", nombre: "San Luis" },
            { codigo: "020702", nombre: "San Nicolás" },
            { codigo: "020703", nombre: "Yauya" }
          ]
        },
        {
          codigo: "0208",
          nombre: "Casma",
          distritos: [
            { codigo: "020801", nombre: "Casma" },
            { codigo: "020802", nombre: "Buena Vista Alta" },
            { codigo: "020803", nombre: "Comandante Noel" },
            { codigo: "020804", nombre: "Yautan" }
          ]
        },
        {
          codigo: "0209",
          nombre: "Corongo",
          distritos: [
            { codigo: "020901", nombre: "Corongo" },
            { codigo: "020902", nombre: "Aco" },
            { codigo: "020903", nombre: "Bambas" },
            { codigo: "020904", nombre: "Cusca" },
            { codigo: "020905", nombre: "La Pampa" },
            { codigo: "020906", nombre: "Yanac" },
            { codigo: "020907", nombre: "Yupan" }
          ]
        },
        {
          codigo: "0210",
          nombre: "Huari",
          distritos: [
            { codigo: "021001", nombre: "Huari" },
            { codigo: "021002", nombre: "Anra" },
            { codigo: "021003", nombre: "Cajay" },
            { codigo: "021004", nombre: "Chavin de Huantar" },
            { codigo: "021005", nombre: "Huacachi" },
            { codigo: "021006", nombre: "Huacchis" },
            { codigo: "021007", nombre: "Huachis" },
            { codigo: "021008", nombre: "Huantar" },
            { codigo: "021009", nombre: "Masin" },
            { codigo: "021010", nombre: "Paucas" },
            { codigo: "021011", nombre: "Ponto" },
            { codigo: "021012", nombre: "Rahuapampa" },
            { codigo: "021013", nombre: "Rapayan" },
            { codigo: "021014", nombre: "San Marcos" },
            { codigo: "021015", nombre: "San Pedro de Chana" },
            { codigo: "021016", nombre: "Uco" }
          ]
        },
        {
          codigo: "0211",
          nombre: "Huarmey",
          distritos: [
            { codigo: "021101", nombre: "Huarmey" },
            { codigo: "021102", nombre: "Cochapeti" },
            { codigo: "021103", nombre: "Culebras" },
            { codigo: "021104", nombre: "Huayan" },
            { codigo: "021105", nombre: "Malvas" }
          ]
        },
        {
          codigo: "0212",
          nombre: "Huaylas",
          distritos: [
            { codigo: "021201", nombre: "Caraz" },
            { codigo: "021202", nombre: "Huallanca" },
            { codigo: "021203", nombre: "Huata" },
            { codigo: "021204", nombre: "Huaylas" },
            { codigo: "021205", nombre: "Mato" },
            { codigo: "021206", nombre: "Pamparomas" },
            { codigo: "021207", nombre: "Pueblo Libre" },
            { codigo: "021208", nombre: "Santa Cruz" },
            { codigo: "021209", nombre: "Santo Toribio" },
            { codigo: "021210", nombre: "Yuracmarca" }
          ]
        },
        {
          codigo: "0213",
          nombre: "Mariscal Luzuriaga",
          distritos: [
            { codigo: "021301", nombre: "Piscobamba" },
            { codigo: "021302", nombre: "Casca" },
            { codigo: "021303", nombre: "Eleazar Guzmán Barrón" },
            { codigo: "021304", nombre: "Fidel Olivas Escudero" },
            { codigo: "021305", nombre: "Llama" },
            { codigo: "021306", nombre: "Llumpa" },
            { codigo: "021307", nombre: "Lucma" },
            { codigo: "021308", nombre: "Musga" }
          ]
        },
        {
          codigo: "0214",
          nombre: "Ocros",
          distritos: [
            { codigo: "021401", nombre: "Ocros" },
            { codigo: "021402", nombre: "Acas" },
            { codigo: "021403", nombre: "Cajamarquilla" },
            { codigo: "021404", nombre: "Carhuapampa" },
            { codigo: "021405", nombre: "Cochas" },
            { codigo: "021406", nombre: "Congas" },
            { codigo: "021407", nombre: "Lipa" },
            { codigo: "021408", nombre: "San Cristóbal de Rajan" },
            { codigo: "021409", nombre: "San Pedro" },
            { codigo: "021410", nombre: "Santiago de Chilcas" }
          ]
        },
        {
          codigo: "0215",
          nombre: "Pallasca",
          distritos: [
            { codigo: "021501", nombre: "Cabana" },
            { codigo: "021502", nombre: "Bolognesi" },
            { codigo: "021503", nombre: "Conchucos" },
            { codigo: "021504", nombre: "Huacaschuque" },
            { codigo: "021505", nombre: "Huandoval" },
            { codigo: "021506", nombre: "Lacabamba" },
            { codigo: "021507", nombre: "Llapo" },
            { codigo: "021508", nombre: "Pallasca" },
            { codigo: "021509", nombre: "Pampas" },
            { codigo: "021510", nombre: "Santa Rosa" },
            { codigo: "021511", nombre: "Tauca" }
          ]
        },
        {
          codigo: "0216",
          nombre: "Pomabamba",
          distritos: [
            { codigo: "021601", nombre: "Pomabamba" },
            { codigo: "021602", nombre: "Huayllan" },
            { codigo: "021603", nombre: "Parobamba" },
            { codigo: "021604", nombre: "Quinuabamba" }
          ]
        },
        {
          codigo: "0217",
          nombre: "Recuay",
          distritos: [
            { codigo: "021701", nombre: "Recuay" },
            { codigo: "021702", nombre: "Catac" },
            { codigo: "021703", nombre: "Cotaparaco" },
            { codigo: "021704", nombre: "Huayllapampa" },
            { codigo: "021705", nombre: "Llacllin" },
            { codigo: "021706", nombre: "Marca" },
            { codigo: "021707", nombre: "Pampas Chico" },
            { codigo: "021708", nombre: "Pararin" },
            { codigo: "021709", nombre: "Tapacocha" },
            { codigo: "021710", nombre: "Ticapampa" }
          ]
        },
        {
          codigo: "0218",
          nombre: "Santa",
          distritos: [
            { codigo: "021801", nombre: "Chimbote" },
            { codigo: "021802", nombre: "Cáceres del Perú" },
            { codigo: "021803", nombre: "Coishco" },
            { codigo: "021804", nombre: "Macate" },
            { codigo: "021805", nombre: "Moro" },
            { codigo: "021806", nombre: "Nepeña" },
            { codigo: "021807", nombre: "Samanco" },
            { codigo: "021808", nombre: "Santa" },
            { codigo: "021809", nombre: "Nuevo Chimbote" }
          ]
        },
        {
          codigo: "0219",
          nombre: "Sihuas",
          distritos: [
            { codigo: "021901", nombre: "Sihuas" },
            { codigo: "021902", nombre: "Acobamba" },
            { codigo: "021903", nombre: "Alfonso Ugarte" },
            { codigo: "021904", nombre: "Cashapampa" },
            { codigo: "021905", nombre: "Chingalpo" },
            { codigo: "021906", nombre: "Huayllabamba" },
            { codigo: "021907", nombre: "Quiches" },
            { codigo: "021908", nombre: "Ragash" },
            { codigo: "021909", nombre: "San Juan" },
            { codigo: "021910", nombre: "Sicsibamba" }
          ]
        },
        {
          codigo: "0220",
          nombre: "Yungay",
          distritos: [
            { codigo: "022001", nombre: "Yungay" },
            { codigo: "022002", nombre: "Cascapara" },
            { codigo: "022003", nombre: "Mancos" },
            { codigo: "022004", nombre: "Matacoto" },
            { codigo: "022005", nombre: "Quillo" },
            { codigo: "022006", nombre: "Ranrahirca" },
            { codigo: "022007", nombre: "Shupluy" },
            { codigo: "022008", nombre: "Yanama" }
          ]
        }
      ]
    },
    {
      codigo: "15",
      nombre: "Lima",
      provincias: [
        {
          codigo: "1501",
          nombre: "Lima",
          distritos: [
            { codigo: "150101", nombre: "Lima" },
            { codigo: "150102", nombre: "Ancón" },
            { codigo: "150103", nombre: "Ate" },
            { codigo: "150104", nombre: "Barranco" },
            { codigo: "150105", nombre: "Breña" },
            { codigo: "150106", nombre: "Carabayllo" },
            { codigo: "150107", nombre: "Chaclacayo" },
            { codigo: "150108", nombre: "Chorrillos" },
            { codigo: "150109", nombre: "Cieneguilla" },
            { codigo: "150110", nombre: "Comas" },
            { codigo: "150111", nombre: "El Agustino" },
            { codigo: "150112", nombre: "Independencia" },
            { codigo: "150113", nombre: "Jesús María" },
            { codigo: "150114", nombre: "La Molina" },
            { codigo: "150115", nombre: "La Victoria" },
            { codigo: "150116", nombre: "Lince" },
            { codigo: "150117", nombre: "Los Olivos" },
            { codigo: "150118", nombre: "Lurigancho" },
            { codigo: "150119", nombre: "Lurín" },
            { codigo: "150120", nombre: "Magdalena del Mar" },
            { codigo: "150121", nombre: "Miraflores" },
            { codigo: "150122", nombre: "Pachacámac" },
            { codigo: "150123", nombre: "Pucusana" },
            { codigo: "150124", nombre: "Pueblo Libre" },
            { codigo: "150125", nombre: "Puente Piedra" },
            { codigo: "150126", nombre: "Punta Hermosa" },
            { codigo: "150127", nombre: "Punta Negra" },
            { codigo: "150128", nombre: "Rímac" },
            { codigo: "150129", nombre: "San Bartolo" },
            { codigo: "150130", nombre: "San Isidro" },
            { codigo: "150131", nombre: "San Juan de Lurigancho" },
            { codigo: "150132", nombre: "San Juan de Miraflores" },
            { codigo: "150133", nombre: "San Luis" },
            { codigo: "150134", nombre: "San Martín de Porres" },
            { codigo: "150135", nombre: "San Miguel" },
            { codigo: "150136", nombre: "Santa Anita" },
            { codigo: "150137", nombre: "Santa María del Mar" },
            { codigo: "150138", nombre: "Santa Rosa" },
            { codigo: "150139", nombre: "Santiago de Surco" },
            { codigo: "150140", nombre: "Surquillo" },
            { codigo: "150141", nombre: "Villa El Salvador" },
            { codigo: "150142", nombre: "Villa María del Triunfo" }
          ]
        },
        {
          codigo: "1502",
          nombre: "Barranca",
          distritos: [
            { codigo: "150201", nombre: "Barranca" },
            { codigo: "150202", nombre: "Paramonga" },
            { codigo: "150203", nombre: "Pativilca" },
            { codigo: "150204", nombre: "Supe" },
            { codigo: "150205", nombre: "Supe Puerto" }
          ]
        },
        {
          codigo: "1503",
          nombre: "Cajatambo",
          distritos: [
            { codigo: "150301", nombre: "Cajatambo" },
            { codigo: "150302", nombre: "Copa" },
            { codigo: "150303", nombre: "Gorgor" },
            { codigo: "150304", nombre: "Huancapon" },
            { codigo: "150305", nombre: "Manas" }
          ]
        },
        {
          codigo: "1504",
          nombre: "Canta",
          distritos: [
            { codigo: "150401", nombre: "Canta" },
            { codigo: "150402", nombre: "Arahuay" },
            { codigo: "150403", nombre: "Huamantanga" },
            { codigo: "150404", nombre: "Huaros" },
            { codigo: "150405", nombre: "Lachaqui" },
            { codigo: "150406", nombre: "San Buenaventura" },
            { codigo: "150407", nombre: "Santa Rosa de Quives" }
          ]
        },
        {
          codigo: "1505",
          nombre: "Cañete",
          distritos: [
            { codigo: "150501", nombre: "San Vicente de Cañete" },
            { codigo: "150502", nombre: "Asia" },
            { codigo: "150503", nombre: "Calango" },
            { codigo: "150504", nombre: "Cerro Azul" },
            { codigo: "150505", nombre: "Chilca" },
            { codigo: "150506", nombre: "Coayllo" },
            { codigo: "150507", nombre: "Imperial" },
            { codigo: "150508", nombre: "Lunahuaná" },
            { codigo: "150509", nombre: "Mala" },
            { codigo: "150510", nombre: "Nuevo Imperial" },
            { codigo: "150511", nombre: "Pacarán" },
            { codigo: "150512", nombre: "Quilmaná" },
            { codigo: "150513", nombre: "San Antonio" },
            { codigo: "150514", nombre: "San Luis" },
            { codigo: "150515", nombre: "Santa Cruz de Flores" },
            { codigo: "150516", nombre: "Zúñiga" }
          ]
        },
        {
          codigo: "1506",
          nombre: "Huaral",
          distritos: [
            { codigo: "150601", nombre: "Huaral" },
            { codigo: "150602", nombre: "Atavillos Alto" },
            { codigo: "150603", nombre: "Atavillos Bajo" },
            { codigo: "150604", nombre: "Aucallama" },
            { codigo: "150605", nombre: "Chancay" },
            { codigo: "150606", nombre: "Ihuari" },
            { codigo: "150607", nombre: "Lampian" },
            { codigo: "150608", nombre: "Pacaraos" },
            { codigo: "150609", nombre: "San Miguel de Acos" },
            { codigo: "150610", nombre: "Santa Cruz de Andamarca" },
            { codigo: "150611", nombre: "Sumbilca" },
            { codigo: "150612", nombre: "Veintisiete de Noviembre" }
          ]
        },
        {
          codigo: "1507",
          nombre: "Huarochirí",
          distritos: [
            { codigo: "150701", nombre: "Matucana" },
            { codigo: "150702", nombre: "Antioquia" },
            { codigo: "150703", nombre: "Callahuanca" },
            { codigo: "150704", nombre: "Carampoma" },
            { codigo: "150705", nombre: "Chicla" },
            { codigo: "150706", nombre: "Cuenca" },
            { codigo: "150707", nombre: "Huachupampa" },
            { codigo: "150708", nombre: "Huanza" },
            { codigo: "150709", nombre: "Huarochirí" },
            { codigo: "150710", nombre: "Lahuaytambo" },
            { codigo: "150711", nombre: "Langa" },
            { codigo: "150712", nombre: "Laraos" },
            { codigo: "150713", nombre: "Mariatana" },
            { codigo: "150714", nombre: "Ricardo Palma" },
            { codigo: "150715", nombre: "San Andrés de Tupicocha" },
            { codigo: "150716", nombre: "San Antonio" },
            { codigo: "150717", nombre: "San Bartolomé" },
            { codigo: "150718", nombre: "San Damian" },
            { codigo: "150719", nombre: "San Juan de Iris" },
            { codigo: "150720", nombre: "San Juan de Tantaranche" },
            { codigo: "150721", nombre: "San Lorenzo de Quinti" },
            { codigo: "150722", nombre: "San Mateo" },
            { codigo: "150723", nombre: "San Mateo de Otao" },
            { codigo: "150724", nombre: "San Pedro de Casta" },
            { codigo: "150725", nombre: "San Pedro de Huancayre" },
            { codigo: "150726", nombre: "Sangallaya" },
            { codigo: "150727", nombre: "Santa Cruz de Cocachacra" },
            { codigo: "150728", nombre: "Santa Eulalia" },
            { codigo: "150729", nombre: "Santiago de Anchucaya" },
            { codigo: "150730", nombre: "Santiago de Tuna" },
            { codigo: "150731", nombre: "Santo Domingo de los Olleros" },
            { codigo: "150732", nombre: "Surco" }
          ]
        },
        {
          codigo: "1508",
          nombre: "Huaura",
          distritos: [
            { codigo: "150801", nombre: "Huacho" },
            { codigo: "150802", nombre: "Ámbar" },
            { codigo: "150803", nombre: "Caleta de Carquín" },
            { codigo: "150804", nombre: "Checras" },
            { codigo: "150805", nombre: "Hualmay" },
            { codigo: "150806", nombre: "Huaura" },
            { codigo: "150807", nombre: "Leoncio Prado" },
            { codigo: "150808", nombre: "Paccho" },
            { codigo: "150809", nombre: "Santa Leonor" },
            { codigo: "150810", nombre: "Santa María" },
            { codigo: "150811", nombre: "Sayan" },
            { codigo: "150812", nombre: "Vegueta" }
          ]
        },
        {
          codigo: "1509",
          nombre: "Oyón",
          distritos: [
            { codigo: "150901", nombre: "Oyón" },
            { codigo: "150902", nombre: "Andajes" },
            { codigo: "150903", nombre: "Caujul" },
            { codigo: "150904", nombre: "Cochamarca" },
            { codigo: "150905", nombre: "Navan" },
            { codigo: "150906", nombre: "Pachangara" }
          ]
        },
        {
          codigo: "1510",
          nombre: "Yauyos",
          distritos: [
            { codigo: "151001", nombre: "Yauyos" },
            { codigo: "151002", nombre: "Alis" },
            { codigo: "151003", nombre: "Allauca" },
            { codigo: "151004", nombre: "Ayaviri" },
            { codigo: "151005", nombre: "Azángaro" },
            { codigo: "151006", nombre: "Cacra" },
            { codigo: "151007", nombre: "Carania" },
            { codigo: "151008", nombre: "Catahuasi" },
            { codigo: "151009", nombre: "Chocos" },
            { codigo: "151010", nombre: "Cochas" },
            { codigo: "151011", nombre: "Colonia" },
            { codigo: "151012", nombre: "Hongos" },
            { codigo: "151013", nombre: "Huampaní" },
            { codigo: "151014", nombre: "Huantan" },
            { codigo: "151015", nombre: "Huañec" },
            { codigo: "151016", nombre: "Laraos" },
            { codigo: "151017", nombre: "Lincha" },
            { codigo: "151018", nombre: "Madean" },
            { codigo: "151019", nombre: "Miraflores" },
            { codigo: "151020", nombre: "Omas" },
            { codigo: "151021", nombre: "Putinza" },
            { codigo: "151022", nombre: "Quinches" },
            { codigo: "151023", nombre: "Quinocay" },
            { codigo: "151024", nombre: "San Joaquín" },
            { codigo: "151025", nombre: "San Pedro de Pilas" },
            { codigo: "151026", nombre: "Tanta" },
            { codigo: "151027", nombre: "Tauripampa" },
            { codigo: "151028", nombre: "Tomas" },
            { codigo: "151029", nombre: "Tupe" },
            { codigo: "151030", nombre: "Viñac" },
            { codigo: "151031", nombre: "Vitis" }
          ]
        }
      ]
    }
  ]
};
