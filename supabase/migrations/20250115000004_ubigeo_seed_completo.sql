-- =========================================
-- Seed UBIGEO COMPLETO - Todas las provincias de Perú
-- =========================================

-- Departamentos principales
insert into ubigeo_departamento (code, nombre) values
  ('01','Amazonas'),
  ('02','Áncash'),
  ('03','Apurímac'),
  ('04','Arequipa'),
  ('05','Ayacucho'),
  ('06','Cajamarca'),
  ('07','Callao'),
  ('08','Cusco'),
  ('09','Huancavelica'),
  ('10','Huánuco'),
  ('11','Ica'),
  ('12','Junín'),
  ('13','La Libertad'),
  ('14','Lambayeque'),
  ('15','Lima'),
  ('16','Loreto'),
  ('17','Madre de Dios'),
  ('18','Moquegua'),
  ('19','Pasco'),
  ('20','Piura'),
  ('21','Puno'),
  ('22','San Martín'),
  ('23','Tacna'),
  ('24','Tumbes'),
  ('25','Ucayali')
on conflict (code) do update set nombre = excluded.nombre;

-- =========================================
-- TODAS LAS PROVINCIAS DE PERÚ
-- =========================================

-- Amazonas (01)
insert into ubigeo_provincia (code, dep_code, nombre) values
  ('0101','01','Chachapoyas'),
  ('0102','01','Bagua'),
  ('0103','01','Bongará'),
  ('0104','01','Condorcanqui'),
  ('0105','01','Luya'),
  ('0106','01','Rodríguez de Mendoza'),
  ('0107','01','Utcubamba')
on conflict (code) do update set nombre = excluded.nombre, dep_code = excluded.dep_code;

-- Áncash (02)
insert into ubigeo_provincia (code, dep_code, nombre) values
  ('0201','02','Huaraz'),
  ('0202','02','Aija'),
  ('0203','02','Antonio Raimondi'),
  ('0204','02','Asunción'),
  ('0205','02','Bolognesi'),
  ('0206','02','Carhuaz'),
  ('0207','02','Carlos Fermín Fitzcarrald'),
  ('0208','02','Casma'),
  ('0209','02','Corongo'),
  ('0210','02','Huari'),
  ('0211','02','Huarmey'),
  ('0212','02','Huaylas'),
  ('0213','02','Mariscal Luzuriaga'),
  ('0214','02','Ocros'),
  ('0215','02','Pallasca'),
  ('0216','02','Pomabamba'),
  ('0217','02','Recuay'),
  ('0218','02','Santa'),
  ('0219','02','Sihuas'),
  ('0220','02','Yungay')
on conflict (code) do update set nombre = excluded.nombre, dep_code = excluded.dep_code;

-- Apurímac (03)
insert into ubigeo_provincia (code, dep_code, nombre) values
  ('0301','03','Abancay'),
  ('0302','03','Andahuaylas'),
  ('0303','03','Antabamba'),
  ('0304','03','Aymaraes'),
  ('0305','03','Cotabambas'),
  ('0306','03','Chincheros'),
  ('0307','03','Grau')
on conflict (code) do update set nombre = excluded.nombre, dep_code = excluded.dep_code;

-- Arequipa (04)
insert into ubigeo_provincia (code, dep_code, nombre) values
  ('0401','04','Arequipa'),
  ('0402','04','Camaná'),
  ('0403','04','Caravelí'),
  ('0404','04','Castilla'),
  ('0405','04','Caylloma'),
  ('0406','04','Condesuyos'),
  ('0407','04','Islay'),
  ('0408','04','La Unión')
on conflict (code) do update set nombre = excluded.nombre, dep_code = excluded.dep_code;

-- Ayacucho (05)
insert into ubigeo_provincia (code, dep_code, nombre) values
  ('0501','05','Huamanga'),
  ('0502','05','Cangallo'),
  ('0503','05','Huanca Sancos'),
  ('0504','05','Huanta'),
  ('0505','05','La Mar'),
  ('0506','05','Lucanas'),
  ('0507','05','Parinacochas'),
  ('0508','05','Paucar del Sara Sara'),
  ('0509','05','Sucre'),
  ('0510','05','Víctor Fajardo'),
  ('0511','05','Vilcas Huamán')
on conflict (code) do update set nombre = excluded.nombre, dep_code = excluded.dep_code;

-- Cajamarca (06)
insert into ubigeo_provincia (code, dep_code, nombre) values
  ('0601','06','Cajamarca'),
  ('0602','06','Cajabamba'),
  ('0603','06','Celendín'),
  ('0604','06','Chota'),
  ('0605','06','Contumazá'),
  ('0606','06','Cutervo'),
  ('0607','06','Hualgayoc'),
  ('0608','06','Jaén'),
  ('0609','06','San Ignacio'),
  ('0610','06','San Marcos'),
  ('0611','06','San Miguel'),
  ('0612','06','San Pablo'),
  ('0613','06','Santa Cruz')
on conflict (code) do update set nombre = excluded.nombre, dep_code = excluded.dep_code;

-- Callao (07)
insert into ubigeo_provincia (code, dep_code, nombre) values
  ('0701','07','Callao')
on conflict (code) do update set nombre = excluded.nombre, dep_code = excluded.dep_code;

-- Cusco (08)
insert into ubigeo_provincia (code, dep_code, nombre) values
  ('0801','08','Cusco'),
  ('0802','08','Acomayo'),
  ('0803','08','Anta'),
  ('0804','08','Calca'),
  ('0805','08','Canas'),
  ('0806','08','Canchis'),
  ('0807','08','Chumbivilcas'),
  ('0808','08','Espinar'),
  ('0809','08','La Convención'),
  ('0810','08','Paruro'),
  ('0811','08','Paucartambo'),
  ('0812','08','Quispicanchi'),
  ('0813','08','Urubamba')
on conflict (code) do update set nombre = excluded.nombre, dep_code = excluded.dep_code;

-- Huancavelica (09)
insert into ubigeo_provincia (code, dep_code, nombre) values
  ('0901','09','Huancavelica'),
  ('0902','09','Acobamba'),
  ('0903','09','Angaraes'),
  ('0904','09','Castrovirreyna'),
  ('0905','09','Churcampa'),
  ('0906','09','Huaytará'),
  ('0907','09','Tayacaja')
on conflict (code) do update set nombre = excluded.nombre, dep_code = excluded.dep_code;

-- Huánuco (10)
insert into ubigeo_provincia (code, dep_code, nombre) values
  ('1001','10','Huánuco'),
  ('1002','10','Ambo'),
  ('1003','10','Dos de Mayo'),
  ('1004','10','Huacaybamba'),
  ('1005','10','Huamalíes'),
  ('1006','10','Leoncio Prado'),
  ('1007','10','Marañón'),
  ('1008','10','Pachitea'),
  ('1009','10','Puerto Inca'),
  ('1010','10','Lauricocha'),
  ('1011','10','Yarowilca')
on conflict (code) do update set nombre = excluded.nombre, dep_code = excluded.dep_code;

-- Ica (11)
insert into ubigeo_provincia (code, dep_code, nombre) values
  ('1101','11','Ica'),
  ('1102','11','Chincha'),
  ('1103','11','Nazca'),
  ('1104','11','Palpa'),
  ('1105','11','Pisco')
on conflict (code) do update set nombre = excluded.nombre, dep_code = excluded.dep_code;

-- Junín (12)
insert into ubigeo_provincia (code, dep_code, nombre) values
  ('1201','12','Huancayo'),
  ('1202','12','Concepción'),
  ('1203','12','Chanchamayo'),
  ('1204','12','Jauja'),
  ('1205','12','Junín'),
  ('1206','12','Satipo'),
  ('1207','12','Tarma'),
  ('1208','12','Yauli'),
  ('1209','12','Chupaca')
on conflict (code) do update set nombre = excluded.nombre, dep_code = excluded.dep_code;

-- La Libertad (13)
insert into ubigeo_provincia (code, dep_code, nombre) values
  ('1301','13','Trujillo'),
  ('1302','13','Ascope'),
  ('1303','13','Bolívar'),
  ('1304','13','Chepén'),
  ('1305','13','Gran Chimú'),
  ('1306','13','Julcán'),
  ('1307','13','Otuzco'),
  ('1308','13','Pacasmayo'),
  ('1309','13','Pataz'),
  ('1310','13','Sánchez Carrión'),
  ('1311','13','Santiago de Chuco'),
  ('1312','13','Virú')
on conflict (code) do update set nombre = excluded.nombre, dep_code = excluded.dep_code;

-- Lambayeque (14)
insert into ubigeo_provincia (code, dep_code, nombre) values
  ('1401','14','Chiclayo'),
  ('1402','14','Ferreñafe'),
  ('1403','14','Lambayeque')
on conflict (code) do update set nombre = excluded.nombre, dep_code = excluded.dep_code;

-- Lima (15)
insert into ubigeo_provincia (code, dep_code, nombre) values
  ('1501','15','Lima'),
  ('1502','15','Barranca'),
  ('1503','15','Cajatambo'),
  ('1504','15','Canta'),
  ('1505','15','Cañete'),
  ('1506','15','Huaral'),
  ('1507','15','Huarochirí'),
  ('1508','15','Huaura'),
  ('1509','15','Oyón'),
  ('1510','15','Yauyos')
on conflict (code) do update set nombre = excluded.nombre, dep_code = excluded.dep_code;

-- Loreto (16)
insert into ubigeo_provincia (code, dep_code, nombre) values
  ('1601','16','Maynas'),
  ('1602','16','Alto Amazonas'),
  ('1603','16','Loreto'),
  ('1604','16','Mariscal Ramón Castilla'),
  ('1605','16','Requena'),
  ('1606','16','Ucayali'),
  ('1607','16','Datem del Marañón'),
  ('1608','16','Putumayo')
on conflict (code) do update set nombre = excluded.nombre, dep_code = excluded.dep_code;

-- Madre de Dios (17)
insert into ubigeo_provincia (code, dep_code, nombre) values
  ('1701','17','Tambopata'),
  ('1702','17','Manu'),
  ('1703','17','Tahuamanu')
on conflict (code) do update set nombre = excluded.nombre, dep_code = excluded.dep_code;

-- Moquegua (18)
insert into ubigeo_provincia (code, dep_code, nombre) values
  ('1801','18','Mariscal Nieto'),
  ('1802','18','General Sánchez Cerro'),
  ('1803','18','Ilo')
on conflict (code) do update set nombre = excluded.nombre, dep_code = excluded.dep_code;

-- Pasco (19)
insert into ubigeo_provincia (code, dep_code, nombre) values
  ('1901','19','Pasco'),
  ('1902','19','Daniel Alcides Carrión'),
  ('1903','19','Oxapampa')
on conflict (code) do update set nombre = excluded.nombre, dep_code = excluded.dep_code;

-- Piura (20)
insert into ubigeo_provincia (code, dep_code, nombre) values
  ('2001','20','Piura'),
  ('2002','20','Ayabaca'),
  ('2003','20','Huancabamba'),
  ('2004','20','Morropón'),
  ('2005','20','Paita'),
  ('2006','20','Sullana'),
  ('2007','20','Talara'),
  ('2008','20','Sechura')
on conflict (code) do update set nombre = excluded.nombre, dep_code = excluded.dep_code;

-- Puno (21)
insert into ubigeo_provincia (code, dep_code, nombre) values
  ('2101','21','Puno'),
  ('2102','21','Azángaro'),
  ('2103','21','Carabaya'),
  ('2104','21','Chucuito'),
  ('2105','21','El Collao'),
  ('2106','21','Huancané'),
  ('2107','21','Lampa'),
  ('2108','21','Melgar'),
  ('2109','21','Moho'),
  ('2110','21','San Antonio de Putina'),
  ('2111','21','San Román'),
  ('2112','21','Sandia'),
  ('2113','21','Yunguyo')
on conflict (code) do update set nombre = excluded.nombre, dep_code = excluded.dep_code;

-- San Martín (22)
insert into ubigeo_provincia (code, dep_code, nombre) values
  ('2201','22','Moyobamba'),
  ('2202','22','Bellavista'),
  ('2203','22','El Dorado'),
  ('2204','22','Huallaga'),
  ('2205','22','Lamas'),
  ('2206','22','Mariscal Cáceres'),
  ('2207','22','Picota'),
  ('2208','22','Rioja'),
  ('2209','22','San Martín'),
  ('2210','22','Tocache')
on conflict (code) do update set nombre = excluded.nombre, dep_code = excluded.dep_code;

-- Tacna (23)
insert into ubigeo_provincia (code, dep_code, nombre) values
  ('2301','23','Tacna'),
  ('2302','23','Candarave'),
  ('2303','23','Jorge Basadre'),
  ('2304','23','Tarata')
on conflict (code) do update set nombre = excluded.nombre, dep_code = excluded.dep_code;

-- Tumbes (24)
insert into ubigeo_provincia (code, dep_code, nombre) values
  ('2401','24','Tumbes'),
  ('2402','24','Contralmirante Villar'),
  ('2403','24','Zarumilla')
on conflict (code) do update set nombre = excluded.nombre, dep_code = excluded.dep_code;

-- Ucayali (25)
insert into ubigeo_provincia (code, dep_code, nombre) values
  ('2501','25','Coronel Portillo'),
  ('2502','25','Atalaya'),
  ('2503','25','Padre Abad'),
  ('2504','25','Purús')
on conflict (code) do update set nombre = excluded.nombre, dep_code = excluded.dep_code;

-- =========================================
-- DISTRITOS PRINCIPALES (Lima, Callao, Arequipa)
-- =========================================

-- Distritos de Lima Metropolitana (1501)
insert into ubigeo_distrito (code, prov_code, dep_code, nombre) values
  ('150101','1501','15','Lima'),
  ('150102','1501','15','Ancón'),
  ('150103','1501','15','Ate'),
  ('150104','1501','15','Barranco'),
  ('150105','1501','15','Breña'),
  ('150106','1501','15','Carabayllo'),
  ('150107','1501','15','Chaclacayo'),
  ('150108','1501','15','Chorrillos'),
  ('150109','1501','15','Cieneguilla'),
  ('150110','1501','15','Comas'),
  ('150111','1501','15','El Agustino'),
  ('150112','1501','15','Independencia'),
  ('150113','1501','15','Jesús María'),
  ('150114','1501','15','La Molina'),
  ('150115','1501','15','La Victoria'),
  ('150116','1501','15','Lince'),
  ('150117','1501','15','Los Olivos'),
  ('150118','1501','15','Lurigancho'),
  ('150119','1501','15','Lurín'),
  ('150120','1501','15','Magdalena del Mar'),
  ('150121','1501','15','Miraflores'),
  ('150122','1501','15','Pachacámac'),
  ('150123','1501','15','Pucusana'),
  ('150124','1501','15','Pueblo Libre'),
  ('150125','1501','15','Puente Piedra'),
  ('150126','1501','15','Punta Hermosa'),
  ('150127','1501','15','Punta Negra'),
  ('150128','1501','15','Rímac'),
  ('150129','1501','15','San Bartolo'),
  ('150130','1501','15','San Isidro'),
  ('150131','1501','15','San Juan de Lurigancho'),
  ('150132','1501','15','San Juan de Miraflores'),
  ('150133','1501','15','San Luis'),
  ('150134','1501','15','San Martín de Porres'),
  ('150135','1501','15','San Miguel'),
  ('150136','1501','15','Santa Anita'),
  ('150137','1501','15','Santa María del Mar'),
  ('150138','1501','15','Santa Rosa'),
  ('150139','1501','15','Santiago de Surco'),
  ('150140','1501','15','Surquillo'),
  ('150141','1501','15','Villa El Salvador'),
  ('150142','1501','15','Villa María del Triunfo')
on conflict (code) do update set nombre = excluded.nombre, prov_code = excluded.prov_code, dep_code = excluded.dep_code;

-- Distritos de Callao
insert into ubigeo_distrito (code, prov_code, dep_code, nombre) values
  ('070101','0701','07','Callao'),
  ('070102','0701','07','Bellavista'),
  ('070103','0701','07','Carmen de la Legua Reynoso'),
  ('070104','0701','07','La Perla'),
  ('070105','0701','07','La Punta'),
  ('070106','0701','07','Ventanilla'),
  ('070107','0701','07','Mi Perú')
on conflict (code) do update set nombre = excluded.nombre, prov_code = excluded.prov_code, dep_code = excluded.dep_code;

-- Distritos de Arequipa (0401)
insert into ubigeo_distrito (code, prov_code, dep_code, nombre) values
  ('040101','0401','04','Arequipa'),
  ('040102','0401','04','Alto Selva Alegre'),
  ('040103','0401','04','Cayma'),
  ('040104','0401','04','Cerro Colorado'),
  ('040105','0401','04','Characato'),
  ('040106','0401','04','Chiguata'),
  ('040107','0401','04','Jacobo Hunter'),
  ('040108','0401','04','La Joya'),
  ('040109','0401','04','Mariano Melgar'),
  ('040110','0401','04','Miraflores'),
  ('040111','0401','04','Mollebaya'),
  ('040112','0401','04','Paucarpata'),
  ('040113','0401','04','Pocsi'),
  ('040114','0401','04','Polobaya'),
  ('040115','0401','04','Quequeña'),
  ('040116','0401','04','Sabandia'),
  ('040117','0401','04','Sachaca'),
  ('040118','0401','04','San Juan de Siguas'),
  ('040119','0401','04','San Juan de Tarucani'),
  ('040120','0401','04','Santa Isabel de Siguas'),
  ('040121','0401','04','Santa Rita de Siguas'),
  ('040122','0401','04','Socabaya'),
  ('040123','0401','04','Tiabaya'),
  ('040124','0401','04','Uchumayo'),
  ('040125','0401','04','Vitor'),
  ('040126','0401','04','Yanahuara'),
  ('040127','0401','04','Yarabamba'),
  ('040128','0401','04','Yura'),
  ('040129','0401','04','José Luis Bustamante y Rivero')
on conflict (code) do update set nombre = excluded.nombre, prov_code = excluded.prov_code, dep_code = excluded.dep_code;
