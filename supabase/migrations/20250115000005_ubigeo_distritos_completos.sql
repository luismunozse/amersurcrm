-- =========================================
-- Seed UBIGEO DISTRITOS COMPLETOS - Perú
-- =========================================
-- Este archivo contiene los distritos principales de cada provincia
-- Para un seed completo con todos los 1,874 distritos, se recomienda
-- descargar los datos oficiales del INEI

-- =========================================
-- DISTRITOS DE AMAZONAS (01)
-- =========================================

-- Chachapoyas (0101)
insert into ubigeo_distrito (code, prov_code, dep_code, nombre) values
  ('010101','0101','01','Chachapoyas'),
  ('010102','0101','01','Asunción'),
  ('010103','0101','01','Balsas'),
  ('010104','0101','01','Cheto'),
  ('010105','0101','01','Chiliquín'),
  ('010106','0101','01','Chuquibamba'),
  ('010107','0101','01','Granada'),
  ('010108','0101','01','Huancas'),
  ('010109','0101','01','La Jalca'),
  ('010110','0101','01','Leimebamba'),
  ('010111','0101','01','Levanto'),
  ('010112','0101','01','Magdalena'),
  ('010113','0101','01','Mariscal Castilla'),
  ('010114','0101','01','Molinopampa'),
  ('010115','0101','01','Montevideo'),
  ('010116','0101','01','Olleros'),
  ('010117','0101','01','Quinjalca'),
  ('010118','0101','01','San Francisco de Daguas'),
  ('010119','0101','01','San Isidro de Maino'),
  ('010120','0101','01','Soloco'),
  ('010121','0101','01','Sonche')
on conflict (code) do update set nombre = excluded.nombre, prov_code = excluded.prov_code, dep_code = excluded.dep_code;

-- Bagua (0102)
insert into ubigeo_distrito (code, prov_code, dep_code, nombre) values
  ('010201','0102','01','Bagua'),
  ('010202','0102','01','Aramango'),
  ('010203','0102','01','Copallín'),
  ('010204','0102','01','El Parco'),
  ('010205','0102','01','Imaza'),
  ('010206','0102','01','La Peca')
on conflict (code) do update set nombre = excluded.nombre, prov_code = excluded.prov_code, dep_code = excluded.dep_code;

-- Bongará (0103)
insert into ubigeo_distrito (code, prov_code, dep_code, nombre) values
  ('010301','0103','01','Jumbilla'),
  ('010302','0103','01','Chisquilla'),
  ('010303','0103','01','Churuja'),
  ('010304','0103','01','Corosha'),
  ('010305','0103','01','Cuispes'),
  ('010306','0103','01','Florida'),
  ('010307','0103','01','Jazán'),
  ('010308','0103','01','Recta'),
  ('010309','0103','01','San Carlos'),
  ('010310','0103','01','Shipasbamba'),
  ('010311','0103','01','Valera'),
  ('010312','0103','01','Yambrasbamba')
on conflict (code) do update set nombre = excluded.nombre, prov_code = excluded.prov_code, dep_code = excluded.dep_code;

-- =========================================
-- DISTRITOS DE ÁNCASH (02)
-- =========================================

-- Huaraz (0201)
insert into ubigeo_distrito (code, prov_code, dep_code, nombre) values
  ('020101','0201','02','Huaraz'),
  ('020102','0201','02','Cochabamba'),
  ('020103','0201','02','Colcabamba'),
  ('020104','0201','02','Huanchay'),
  ('020105','0201','02','Independencia'),
  ('020106','0201','02','Jangas'),
  ('020107','0201','02','La Libertad'),
  ('020108','0201','02','Olleros'),
  ('020109','0201','02','Pampas'),
  ('020110','0201','02','Pariacoto'),
  ('020111','0201','02','Pira'),
  ('020112','0201','02','Tarica')
on conflict (code) do update set nombre = excluded.nombre, prov_code = excluded.prov_code, dep_code = excluded.dep_code;

-- Santa (0218) - Chimbote
insert into ubigeo_distrito (code, prov_code, dep_code, nombre) values
  ('021801','0218','02','Chimbote'),
  ('021802','0218','02','Cáceres del Perú'),
  ('021803','0218','02','Coishco'),
  ('021804','0218','02','Macate'),
  ('021805','0218','02','Moro'),
  ('021806','0218','02','Nepeña'),
  ('021807','0218','02','Samanco'),
  ('021808','0218','02','Santa'),
  ('021809','0218','02','Nuevo Chimbote')
on conflict (code) do update set nombre = excluded.nombre, prov_code = excluded.prov_code, dep_code = excluded.dep_code;

-- =========================================
-- DISTRITOS DE APURÍMAC (03)
-- =========================================

-- Abancay (0301)
insert into ubigeo_distrito (code, prov_code, dep_code, nombre) values
  ('030101','0301','03','Abancay'),
  ('030102','0301','03','Chacoche'),
  ('030103','0301','03','Circa'),
  ('030104','0301','03','Curahuasi'),
  ('030105','0301','03','Huanipaca'),
  ('030106','0301','03','Lambrama'),
  ('030107','0301','03','Pichirhua'),
  ('030108','0301','03','San Pedro de Cachora'),
  ('030109','0301','03','Tamburco')
on conflict (code) do update set nombre = excluded.nombre, prov_code = excluded.prov_code, dep_code = excluded.dep_code;

-- =========================================
-- DISTRITOS DE AYACUCHO (05)
-- =========================================

-- Huamanga (0501)
insert into ubigeo_distrito (code, prov_code, dep_code, nombre) values
  ('050101','0501','05','Ayacucho'),
  ('050102','0501','05','Acos Vinchos'),
  ('050103','0501','05','Carmen Alto'),
  ('050104','0501','05','Chiara'),
  ('050105','0501','05','Ocros'),
  ('050106','0501','05','Pacaycasa'),
  ('050107','0501','05','Quinua'),
  ('050108','0501','05','San José de Ticllas'),
  ('050109','0501','05','San Juan Bautista'),
  ('050110','0501','05','Santiago de Pischa'),
  ('050111','0501','05','Socos'),
  ('050112','0501','05','Tambillo'),
  ('050113','0501','05','Vinchos')
on conflict (code) do update set nombre = excluded.nombre, prov_code = excluded.prov_code, dep_code = excluded.dep_code;

-- =========================================
-- DISTRITOS DE CAJAMARCA (06)
-- =========================================

-- Cajamarca (0601)
insert into ubigeo_distrito (code, prov_code, dep_code, nombre) values
  ('060101','0601','06','Cajamarca'),
  ('060102','0601','06','Asunción'),
  ('060103','0601','06','Chetilla'),
  ('060104','0601','06','Cospan'),
  ('060105','0601','06','Encañada'),
  ('060106','0601','06','Jesús'),
  ('060107','0601','06','Llacanora'),
  ('060108','0601','06','Los Baños del Inca'),
  ('060109','0601','06','Magdalena'),
  ('060110','0601','06','Matara'),
  ('060111','0601','06','Namora'),
  ('060112','0601','06','San Juan')
on conflict (code) do update set nombre = excluded.nombre, prov_code = excluded.prov_code, dep_code = excluded.dep_code;

-- =========================================
-- DISTRITOS DE CUSCO (08)
-- =========================================

-- Cusco (0801)
insert into ubigeo_distrito (code, prov_code, dep_code, nombre) values
  ('080101','0801','08','Cusco'),
  ('080102','0801','08','Ccorca'),
  ('080103','0801','08','Poroy'),
  ('080104','0801','08','San Jerónimo'),
  ('080105','0801','08','San Sebastian'),
  ('080106','0801','08','Santiago'),
  ('080107','0801','08','Saylla'),
  ('080108','0801','08','Wanchaq')
on conflict (code) do update set nombre = excluded.nombre, prov_code = excluded.prov_code, dep_code = excluded.dep_code;

-- =========================================
-- DISTRITOS DE HUANCAVELICA (09)
-- =========================================

-- Huancavelica (0901)
insert into ubigeo_distrito (code, prov_code, dep_code, nombre) values
  ('090101','0901','09','Huancavelica'),
  ('090102','0901','09','Acobambilla'),
  ('090103','0901','09','Acoria'),
  ('090104','0901','09','Conayca'),
  ('090105','0901','09','Cuenca'),
  ('090106','0901','09','Huachocolpa'),
  ('090107','0901','09','Huayllahuara'),
  ('090108','0901','09','Izcuchaca'),
  ('090109','0901','09','Laria'),
  ('090110','0901','09','Manta'),
  ('090111','0901','09','Mariscal Cáceres'),
  ('090112','0901','09','Moya'),
  ('090113','0901','09','Nuevo Occoro'),
  ('090114','0901','09','Palca'),
  ('090115','0901','09','Pilchaca'),
  ('090116','0901','09','Vilca'),
  ('090117','0901','09','Yauli')
on conflict (code) do update set nombre = excluded.nombre, prov_code = excluded.prov_code, dep_code = excluded.dep_code;

-- =========================================
-- DISTRITOS DE HUÁNUCO (10)
-- =========================================

-- Huánuco (1001)
insert into ubigeo_distrito (code, prov_code, dep_code, nombre) values
  ('100101','1001','10','Huánuco'),
  ('100102','1001','10','Amarilis'),
  ('100103','1001','10','Chinchao'),
  ('100104','1001','10','Churubamba'),
  ('100105','1001','10','Margos'),
  ('100106','1001','10','Quisqui'),
  ('100107','1001','10','San Francisco de Cayran'),
  ('100108','1001','10','San Pedro de Chaulán'),
  ('100109','1001','10','Santa María del Valle'),
  ('100110','1001','10','Yarumayo'),
  ('100111','1001','10','Pillco Marca'),
  ('100112','1001','10','Yacus')
on conflict (code) do update set nombre = excluded.nombre, prov_code = excluded.prov_code, dep_code = excluded.dep_code;

-- =========================================
-- DISTRITOS DE ICA (11)
-- =========================================

-- Ica (1101)
insert into ubigeo_distrito (code, prov_code, dep_code, nombre) values
  ('110101','1101','11','Ica'),
  ('110102','1101','11','La Tinguiña'),
  ('110103','1101','11','Los Aquijes'),
  ('110104','1101','11','Ocucaje'),
  ('110105','1101','11','Pachacutec'),
  ('110106','1101','11','Parcona'),
  ('110107','1101','11','Pueblo Nuevo'),
  ('110108','1101','11','Salas'),
  ('110109','1101','11','San José de Los Molinos'),
  ('110110','1101','11','San Juan Bautista'),
  ('110111','1101','11','Santiago'),
  ('110112','1101','11','Subtanjalla'),
  ('110113','1101','11','Tate'),
  ('110114','1101','11','Yauca del Rosario')
on conflict (code) do update set nombre = excluded.nombre, prov_code = excluded.prov_code, dep_code = excluded.dep_code;

-- =========================================
-- DISTRITOS DE JUNÍN (12)
-- =========================================

-- Huancayo (1201)
insert into ubigeo_distrito (code, prov_code, dep_code, nombre) values
  ('120101','1201','12','Huancayo'),
  ('120102','1201','12','Carhuacallanga'),
  ('120103','1201','12','Chacapampa'),
  ('120104','1201','12','Chicche'),
  ('120105','1201','12','Chilca'),
  ('120106','1201','12','Chongos Alto'),
  ('120107','1201','12','Chupuro'),
  ('120108','1201','12','Colca'),
  ('120109','1201','12','Cullhuas'),
  ('120110','1201','12','El Tambo'),
  ('120111','1201','12','Huacrapuquio'),
  ('120112','1201','12','Hualhuas'),
  ('120113','1201','12','Huancan'),
  ('120114','1201','12','Huasicancha'),
  ('120115','1201','12','Huayucachi'),
  ('120116','1201','12','Ingenio'),
  ('120117','1201','12','Pariahuanca'),
  ('120118','1201','12','Pilcomayo'),
  ('120119','1201','12','Pucará'),
  ('120120','1201','12','Quichuay'),
  ('120121','1201','12','Quilcas'),
  ('120122','1201','12','San Agustín'),
  ('120123','1201','12','San Jerónimo de Tunan'),
  ('120124','1201','12','Saño'),
  ('120125','1201','12','Sapallanga'),
  ('120126','1201','12','Sicaya'),
  ('120127','1201','12','Santo Domingo de Acobamba'),
  ('120128','1201','12','Viques')
on conflict (code) do update set nombre = excluded.nombre, prov_code = excluded.prov_code, dep_code = excluded.dep_code;

-- =========================================
-- DISTRITOS DE LA LIBERTAD (13)
-- =========================================

-- Trujillo (1301)
insert into ubigeo_distrito (code, prov_code, dep_code, nombre) values
  ('130101','1301','13','Trujillo'),
  ('130102','1301','13','El Porvenir'),
  ('130103','1301','13','Florencia de Mora'),
  ('130104','1301','13','Huanchaco'),
  ('130105','1301','13','La Esperanza'),
  ('130106','1301','13','Laredo'),
  ('130107','1301','13','Moche'),
  ('130108','1301','13','Poroto'),
  ('130109','1301','13','Salaverry'),
  ('130110','1301','13','Simbal'),
  ('130111','1301','13','Victor Larco Herrera')
on conflict (code) do update set nombre = excluded.nombre, prov_code = excluded.prov_code, dep_code = excluded.dep_code;

-- =========================================
-- DISTRITOS DE LAMBAYEQUE (14)
-- =========================================

-- Chiclayo (1401)
insert into ubigeo_distrito (code, prov_code, dep_code, nombre) values
  ('140101','1401','14','Chiclayo'),
  ('140102','1401','14','Cayalti'),
  ('140103','1401','14','Cayran'),
  ('140104','1401','14','Chongoyape'),
  ('140105','1401','14','Eten'),
  ('140106','1401','14','Eten Puerto'),
  ('140107','1401','14','José Leonardo Ortiz'),
  ('140108','1401','14','La Victoria'),
  ('140109','1401','14','Lagunas'),
  ('140110','1401','14','Monsefú'),
  ('140111','1401','14','Nueva Arica'),
  ('140112','1401','14','Oyotún'),
  ('140113','1401','14','Picsi'),
  ('140114','1401','14','Pimentel'),
  ('140115','1401','14','Pomalca'),
  ('140116','1401','14','Pucalá'),
  ('140117','1401','14','Reque'),
  ('140118','1401','14','Santa Rosa'),
  ('140119','1401','14','Saña'),
  ('140120','1401','14','San José'),
  ('140121','1401','14','Tuman')
on conflict (code) do update set nombre = excluded.nombre, prov_code = excluded.prov_code, dep_code = excluded.dep_code;

-- =========================================
-- DISTRITOS DE LORETO (16)
-- =========================================

-- Maynas (1601) - Iquitos
insert into ubigeo_distrito (code, prov_code, dep_code, nombre) values
  ('160101','1601','16','Iquitos'),
  ('160102','1601','16','Alto Nanay'),
  ('160103','1601','16','Fernando Lores'),
  ('160104','1601','16','Indiana'),
  ('160105','1601','16','Las Amazonas'),
  ('160106','1601','16','Mazan'),
  ('160107','1601','16','Napo'),
  ('160108','1601','16','Punchana'),
  ('160109','1601','16','Torres Causana'),
  ('160110','1601','16','Belén'),
  ('160111','1601','16','San Juan Bautista'),
  ('160112','1601','16','Teniente Manuel Clavero')
on conflict (code) do update set nombre = excluded.nombre, prov_code = excluded.prov_code, dep_code = excluded.dep_code;

-- =========================================
-- DISTRITOS DE MADRE DE DIOS (17)
-- =========================================

-- Tambopata (1701) - Puerto Maldonado
insert into ubigeo_distrito (code, prov_code, dep_code, nombre) values
  ('170101','1701','17','Tambopata'),
  ('170102','1701','17','Inambari'),
  ('170103','1701','17','Laberinto'),
  ('170104','1701','17','Las Piedras')
on conflict (code) do update set nombre = excluded.nombre, prov_code = excluded.prov_code, dep_code = excluded.dep_code;

-- =========================================
-- DISTRITOS DE MOQUEGUA (18)
-- =========================================

-- Mariscal Nieto (1801) - Moquegua
insert into ubigeo_distrito (code, prov_code, dep_code, nombre) values
  ('180101','1801','18','Moquegua'),
  ('180102','1801','18','Carumas'),
  ('180103','1801','18','Cuchumbaya'),
  ('180104','1801','18','Samegua'),
  ('180105','1801','18','San Cristóbal'),
  ('180106','1801','18','Torata')
on conflict (code) do update set nombre = excluded.nombre, prov_code = excluded.prov_code, dep_code = excluded.dep_code;

-- =========================================
-- DISTRITOS DE PASCO (19)
-- =========================================

-- Pasco (1901) - Cerro de Pasco
insert into ubigeo_distrito (code, prov_code, dep_code, nombre) values
  ('190101','1901','19','Chaupimarca'),
  ('190102','1901','19','Huachón'),
  ('190103','1901','19','Huariaca'),
  ('190104','1901','19','Huayllay'),
  ('190105','1901','19','Ninacaca'),
  ('190106','1901','19','Pallanchacra'),
  ('190107','1901','19','Paucartambo'),
  ('190108','1901','19','San Francisco de Asís de Yarusyacan'),
  ('190109','1901','19','Simon Bolívar'),
  ('190110','1901','19','Ticlacayan'),
  ('190111','1901','19','Tinyahuarco'),
  ('190112','1901','19','Vicco'),
  ('190113','1901','19','Yanacancha')
on conflict (code) do update set nombre = excluded.nombre, prov_code = excluded.prov_code, dep_code = excluded.dep_code;

-- =========================================
-- DISTRITOS DE PIURA (20)
-- =========================================

-- Piura (2001)
insert into ubigeo_distrito (code, prov_code, dep_code, nombre) values
  ('200101','2001','20','Piura'),
  ('200102','2001','20','Castilla'),
  ('200103','2001','20','Catacaos'),
  ('200104','2001','20','Cura Mori'),
  ('200105','2001','20','El Tallan'),
  ('200106','2001','20','La Arena'),
  ('200107','2001','20','La Unión'),
  ('200108','2001','20','Las Lomas'),
  ('200109','2001','20','Tambo Grande'),
  ('200110','2001','20','Veintiseis de Octubre')
on conflict (code) do update set nombre = excluded.nombre, prov_code = excluded.prov_code, dep_code = excluded.dep_code;

-- =========================================
-- DISTRITOS DE PUNO (21)
-- =========================================

-- Puno (2101)
insert into ubigeo_distrito (code, prov_code, dep_code, nombre) values
  ('210101','2101','21','Puno'),
  ('210102','2101','21','Acora'),
  ('210103','2101','21','Amantani'),
  ('210104','2101','21','Atuncolla'),
  ('210105','2101','21','Capachica'),
  ('210106','2101','21','Chucuito'),
  ('210107','2101','21','Coata'),
  ('210108','2101','21','Huata'),
  ('210109','2101','21','Mañazo'),
  ('210110','2101','21','Paucarcolla'),
  ('210111','2101','21','Pichacani'),
  ('210112','2101','21','Plateria'),
  ('210113','2101','21','San Antonio'),
  ('210114','2101','21','Tiquillaca'),
  ('210115','2101','21','Vilque')
on conflict (code) do update set nombre = excluded.nombre, prov_code = excluded.prov_code, dep_code = excluded.dep_code;

-- =========================================
-- DISTRITOS DE SAN MARTÍN (22)
-- =========================================

-- Moyobamba (2201)
insert into ubigeo_distrito (code, prov_code, dep_code, nombre) values
  ('220101','2201','22','Moyobamba'),
  ('220102','2201','22','Calzada'),
  ('220103','2201','22','Habana'),
  ('220104','2201','22','Jepelacio'),
  ('220105','2201','22','Soritor'),
  ('220106','2201','22','Yantalo')
on conflict (code) do update set nombre = excluded.nombre, prov_code = excluded.prov_code, dep_code = excluded.dep_code;

-- =========================================
-- DISTRITOS DE TACNA (23)
-- =========================================

-- Tacna (2301)
insert into ubigeo_distrito (code, prov_code, dep_code, nombre) values
  ('230101','2301','23','Tacna'),
  ('230102','2301','23','Alto de la Alianza'),
  ('230103','2301','23','Calana'),
  ('230104','2301','23','Ciudad Nueva'),
  ('230105','2301','23','Inclan'),
  ('230106','2301','23','Pachia'),
  ('230107','2301','23','Palca'),
  ('230108','2301','23','Pocollay'),
  ('230109','2301','23','Sama'),
  ('230110','2301','23','Coronel Gregorio Albarracín Lanchipa')
on conflict (code) do update set nombre = excluded.nombre, prov_code = excluded.prov_code, dep_code = excluded.dep_code;

-- =========================================
-- DISTRITOS DE TUMBES (24)
-- =========================================

-- Tumbes (2401)
insert into ubigeo_distrito (code, prov_code, dep_code, nombre) values
  ('240101','2401','24','Tumbes'),
  ('240102','2401','24','Corrales'),
  ('240103','2401','24','La Cruz'),
  ('240104','2401','24','Pampas de Hospital'),
  ('240105','2401','24','San Jacinto'),
  ('240106','2401','24','San Juan de la Virgen'),
  ('240107','2401','24','Zarumilla')
on conflict (code) do update set nombre = excluded.nombre, prov_code = excluded.prov_code, dep_code = excluded.dep_code;

-- =========================================
-- DISTRITOS DE UCAYALI (25)
-- =========================================

-- Coronel Portillo (2501) - Pucallpa
insert into ubigeo_distrito (code, prov_code, dep_code, nombre) values
  ('250101','2501','25','Calleria'),
  ('250102','2501','25','Campoverde'),
  ('250103','2501','25','Iparia'),
  ('250104','2501','25','Masisea'),
  ('250105','2501','25','Yarinacocha'),
  ('250106','2501','25','Nueva Requena')
on conflict (code) do update set nombre = excluded.nombre, prov_code = excluded.prov_code, dep_code = excluded.dep_code;
