-- =========================================
-- Seed UBIGEO - Datos iniciales de Perú
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

-- Provincias de Lima (ejemplo completo)
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

-- Callao (1 provincia = '0701')
insert into ubigeo_provincia (code, dep_code, nombre) values
  ('0701','07','Callao')
on conflict (code) do update set nombre = excluded.nombre, dep_code = excluded.dep_code;

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

-- Arequipa (ejemplo)
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
