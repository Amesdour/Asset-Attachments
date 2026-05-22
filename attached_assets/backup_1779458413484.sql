--
-- PostgreSQL database dump
--

-- Dumped from database version 18.3 (Debian 18.3-1.pgdg12+1)
-- Dumped by pg_dump version 18.4 (Debian 18.4-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: ewgcet_db_user
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO ewgcet_db_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: clients; Type: TABLE; Schema: public; Owner: ewgcet_db_user
--

CREATE TABLE public.clients (
    id character varying(20) NOT NULL,
    name character varying(200) NOT NULL,
    client_type character varying(30) DEFAULT ''::character varying,
    type character varying(30) DEFAULT ''::character varying,
    status character varying(30) DEFAULT 'pending'::character varying,
    credit_limit numeric(14,2) DEFAULT 0,
    consumed numeric(14,2) DEFAULT 0,
    credit_enabled boolean DEFAULT false,
    weight_limit_year numeric(12,3) DEFAULT 0,
    pay_frequency character varying(20) DEFAULT 'monthly'::character varying,
    pay_instrument character varying(20) DEFAULT 'cheque'::character varying,
    phone character varying(50) DEFAULT ''::character varying,
    address character varying(200) DEFAULT ''::character varying,
    nif character varying(50) DEFAULT ''::character varying,
    rc character varying(50) DEFAULT ''::character varying,
    docs jsonb DEFAULT '[]'::jsonb,
    note text DEFAULT ''::text,
    vat_subject boolean DEFAULT false,
    assigned_site character varying(20) DEFAULT ''::character varying,
    assigned_sites jsonb DEFAULT '[]'::jsonb,
    rotation_limit integer DEFAULT 0,
    service_type character varying(30) DEFAULT 'treatment_only'::character varying,
    collect_billing_mode character varying(20) DEFAULT 'tonnage'::character varying
);


ALTER TABLE public.clients OWNER TO ewgcet_db_user;

--
-- Name: company_trucks; Type: TABLE; Schema: public; Owner: ewgcet_db_user
--

CREATE TABLE public.company_trucks (
    id character varying(40) NOT NULL,
    plate character varying(30) NOT NULL,
    label character varying(100) DEFAULT ''::character varying,
    tare numeric(10,3) DEFAULT 0,
    status character varying(20) DEFAULT 'active'::character varying
);


ALTER TABLE public.company_trucks OWNER TO ewgcet_db_user;

--
-- Name: discharges; Type: TABLE; Schema: public; Owner: ewgcet_db_user
--

CREATE TABLE public.discharges (
    id character varying(40) NOT NULL,
    ts timestamp without time zone NOT NULL,
    site_id character varying(20),
    client_id character varying(20),
    client_name character varying(200),
    truck character varying(30),
    waste_type character varying(20),
    gross numeric(12,3) DEFAULT 0,
    tare numeric(12,3) DEFAULT 0,
    net numeric(12,3) DEFAULT 0,
    unit_price numeric(14,2) DEFAULT 0,
    total numeric(14,2) DEFAULT 0,
    status character varying(20) DEFAULT 'ok'::character varying,
    pay_method character varying(20),
    op_id character varying(20),
    correction_reason text DEFAULT ''::text,
    op_type character varying(20) DEFAULT 'treatment'::character varying
);


ALTER TABLE public.discharges OWNER TO ewgcet_db_user;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: ewgcet_db_user
--

CREATE TABLE public.invoices (
    id character varying(40) NOT NULL,
    client_id character varying(20),
    month character varying(7),
    total_amount numeric(14,2) DEFAULT 0,
    paid_amount numeric(14,2) DEFAULT 0,
    status character varying(20) DEFAULT 'pending'::character varying,
    generated_at timestamp without time zone DEFAULT now(),
    paid_at timestamp without time zone,
    note text DEFAULT ''::text
);


ALTER TABLE public.invoices OWNER TO ewgcet_db_user;

--
-- Name: sites; Type: TABLE; Schema: public; Owner: ewgcet_db_user
--

CREATE TABLE public.sites (
    id character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(20),
    region character varying(100),
    capacity numeric(14,2) DEFAULT 0,
    used numeric(14,2) DEFAULT 0,
    status character varying(20) DEFAULT 'active'::character varying,
    active_since date,
    manager character varying(100) DEFAULT ''::character varying,
    commune character varying(100) DEFAULT ''::character varying,
    localisation character varying(200) DEFAULT ''::character varying,
    accepted_waste jsonb DEFAULT '[]'::jsonb
);


ALTER TABLE public.sites OWNER TO ewgcet_db_user;

--
-- Name: users; Type: TABLE; Schema: public; Owner: ewgcet_db_user
--

CREATE TABLE public.users (
    id character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    password character varying(100) NOT NULL,
    role character varying(20) DEFAULT 'operator'::character varying,
    status character varying(20) DEFAULT 'active'::character varying,
    phone character varying(50) DEFAULT ''::character varying,
    matricule character varying(50) DEFAULT ''::character varying,
    site_id character varying(20) DEFAULT 'all'::character varying,
    created_at date DEFAULT CURRENT_DATE
);


ALTER TABLE public.users OWNER TO ewgcet_db_user;

--
-- Name: waste_types; Type: TABLE; Schema: public; Owner: ewgcet_db_user
--

CREATE TABLE public.waste_types (
    id character varying(20) NOT NULL,
    label character varying(100) NOT NULL,
    price numeric(14,2) DEFAULT 0,
    unit character varying(10) DEFAULT 't'::character varying,
    site_types jsonb DEFAULT '[]'::jsonb,
    rotation_price numeric(14,2) DEFAULT 0,
    collect_price numeric(14,2) DEFAULT 0,
    collect_rotation_price numeric(14,2) DEFAULT 0
);


ALTER TABLE public.waste_types OWNER TO ewgcet_db_user;

--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: ewgcet_db_user
--

COPY public.clients (id, name, client_type, type, status, credit_limit, consumed, credit_enabled, weight_limit_year, pay_frequency, pay_instrument, phone, address, nif, rc, docs, note, vat_subject, assigned_site, assigned_sites, rotation_limit, service_type, collect_billing_mode) FROM stdin;
C008	Rachid Benbrahim	private	prepaid	approved	200000.00	78910.00	f	0.000	monthly	cheque	0550 33 44 55	Jijel			[]	Bonus pr├⌐pay├⌐ 200 000 DA	f		["CDM-ELM", "CDI-TAS", "CET-JIJ"]	0	both	tonnage
C007	Entreprise Benali SARL	cash	daily	approved	0.00	0.00	f	0.000	monthly	cheque	0770 44 55 66	Taher			[]		f		["CET-JIJ", "CDI-TAS"]	0	treatment_only	tonnage
C001	Commune de Jijel	state	convention	rejected	0.00	0.00	f	5000.000	monthly	cheque	034 70 12 34	Jijel Centre	099012345678901		["Arr├¬t├⌐ communal", "Convention sign├⌐e"]	exclude	f		[]	0	treatment_only	tonnage
C006	Hadj Mourad Rabah	cash	daily	approved	0.00	0.00	f	0.000	monthly	cheque	0770 11 22 33	Jijel			[]		f		["CET-TAH"]	0	treatment_only	tonnage
CMP2CW5PP	Said bouroaih	cash	daily	approved	0.00	0.00	f	0.000	monthly	cheque	0666666666		48484156486478		[]		f		["CET-ELM"]	0	treatment_only	tonnage
CMP11QW9I	zazra	private	rotation	approved	0.00	0.00	f	98.000	annual	cheque	46546	zrzrzr	6446	4546	["Assurance Responsabilit├⌐ Civile", "Convention sign├⌐e", "Extrait de r├┤le apur├⌐"]		t		["CDI-TAS", "CDM-ELM"]	0	treatment_only	tonnage
CMP360T2M	┘ÄAPC JIJEL	state	convention	approved	0.00	515005.00	f	2000.000	annual	bank	034470945	JIJEL	09923450058839403	18/09942	["Arr├¬t├⌐ ou d├⌐lib├⌐ration d'assembl├⌐e", "Convention sign├⌐e", "Bon de commande ou r├⌐quisition"]		t		["CDI-TAS", "CDM-JIJ", "CET-JIJ"]	50	both	tonnage
CMP2XDS0F	APC EL MILIA	state	convention	approved	0.00	34850.00	f	500.000	annual	bank	034098777	El MiLIA	9908727772898	18/788278	["Arr├¬t├⌐ ou d├⌐lib├⌐ration d'assembl├⌐e", "Convention sign├⌐e", "Bon de commande ou r├⌐quisition"]		t		["CDM-ELM", "CET-ELM"]	55	treatment_only	tonnage
C005	SPA Entraval Alg├⌐rie	private	convention	approved	0.00	0.00	f	0.000	monthly	cheque	034 70 56 78	El Milia			["Registre de Commerce (RC)", "Num├⌐ro d'Identification Fiscale (NIF)", "Assurance Responsabilit├⌐ Civile", "Extrait de r├┤le apur├⌐", "Convention sign├⌐e"]		t		["CET-ELM"]	0	treatment_only	tonnage
C002	Commune de Taher	state	convention	approved	0.00	78200.00	f	3000.000	annual	bank	034 70 23 45	Taher	099023456789012		["Arr├¬t├⌐ communal", "Convention sign├⌐e"]		f		["CDM-TAH", "CET-TAH"]	0	treatment_only	tonnage
C003	Clinique M├⌐dicale AFAK	private	convention	approved	0.00	0.00	f	0.000	annual	cheque	034 70 34 56	Cit├⌐ Cnep, Jijel	099034567890123	18/00-1234567B18	["RC", "NIF", "Assurance RC", "Bail commercial", "Registre de Commerce (RC)", "Num├⌐ro d'Identification Fiscale (NIF)", "Assurance Responsabilit├⌐ Civile", "Extrait de r├┤le apur├⌐", "Convention sign├⌐e"]		t		["CDM-JIJ", "CET-JIJ", "CDI-TAS"]	48	treat_and_collect	rotation
C004	EURL COSIDER BTP Jijel	private	convention	approved	0.00	303120.00	f	500.000	annual	cheque	034 70 45 67	Zone Activit├⌐, Jijel	099045678901234	18/00-7654321B18	["RC", "NIF"]		t		["CDM-JIJ", "CET-JIJ", "CDI-TAS"]	44	both	tonnage
\.


--
-- Data for Name: company_trucks; Type: TABLE DATA; Schema: public; Owner: ewgcet_db_user
--

COPY public.company_trucks (id, plate, label, tare, status) FROM stdin;
ct_1778998935207	0122-318-18	Camion ├á benne tasseuse	8.000	active
ct_1779044209051	00092-317-18	Camion ├á benne tasseuse	9.000	active
\.


--
-- Data for Name: discharges; Type: TABLE DATA; Schema: public; Owner: ewgcet_db_user
--

COPY public.discharges (id, ts, site_id, client_id, client_name, truck, waste_type, gross, tare, net, unit_price, total, status, pay_method, op_id, correction_reason, op_type) FROM stdin;
DMP0ANGFW	2026-05-10 21:37:00	CDI-TAS	C004	EURL COSIDER BTP Jijel	8883-318-18	INE	69.000	5.000	64.000	600.00	38400.00	settled	convention	U001		treatment
DMP1U97CV	2026-05-11 23:34:00	CET-JIJ	C004	EURL COSIDER BTP Jijel	288-317-18	IND	28.000	3.000	25.000	1200.00	30000.00	cancelled	convention	U001	┘ä	treatment
DMP11V7BF	2026-05-11 10:19:00	CDI-TAS	CMP11QW9I	zazra	4655-318-19	INE	46.000	1.000	45.000	1000.00	1000.00	settled	rotation	U001		treatment
DMP1QCRHZ	2026-05-11 21:45:00	CDI-TAS	CMP11QW9I	zazra	124-312-18	INE	33.000	6.000	27.000	1000.00	1000.00	settled	rotation	U003		treatment
DMP362ZWK	2026-05-12 21:53:00	CET-JIJ	CMP360T2M	┘ÄAPC JIJEL	847733-324-18	MEN	56.000	5.000	51.000	850.00	43350.00	settled	convention	U001	Centre 	treatment
DMP1SUC7E	2026-05-11 22:54:00	CET-ELM	C008	Rachid Benbrahim	4355-314-18	MEN	45.000	4.000	41.000	850.00	34850.00	settled	prepaid	U001	├╣	treatment
DMP3S5XJK	2026-05-13 08:11:00	CET-JIJ	CMP360T2M	┘ÄAPC JIJEL	1234-318-18	MEN	58.000	2.400	55.600	850.00	47260.00	settled	convention	U002	;	treatment
DMP5BYWAB	2026-05-14 10:13:00	CDI-TAS	C008	Rachid Benbrahim	244-318-18	INE	35.000	4.900	30.100	600.00	18060.00	settled	prepaid	U001		treatment
DMP34UNH6	2026-05-12 21:18:00	CET-JIJ	C004	EURL COSIDER BTP Jijel	544-312-18	IND	0.000	0.000	0.000	1200.00	0.00	cancelled	convention	U001	corriger le centre 	treatment
DMP2XJXTI	2026-05-12 17:54:00	CET-ELM	CMP2XDS0F	APC EL MILIA	2354-314-18	MEN	45.000	4.000	41.000	850.00	34850.00	settled	convention	U004	Centre	treatment
DMP5C4FZN	2026-05-14 10:17:00	CDI-TAS	C004	EURL COSIDER BTP Jijel	55556-318-18	INE	56.000	2.800	53.200	600.00	31920.00	settled	convention	UMOYN51KE		treatment
DMP2XA7WT	2026-05-12 17:46:00	CET-ELM	CMP11QW9I	zazra	773-317-19	MEN	52.000	3.000	49.000	850.00	41650.00	settled	rotation	U004	Centre 	treatment
DMP73MQ5W	2026-05-15 15:55:00	CET-JIJ	CMP360T2M	┘ÄAPC JIJEL	7666-319-18	MEN	65.000	8.000	57.000	1000.00	1000.00	settled	rotation	U001		treatment
DMP3S5D88	2026-05-13 08:10:00	CET-JIJ	CMP360T2M	┘ÄAPC JIJEL	01234-318-18	MEN	56.000	2.500	53.500	850.00	45475.00	settled	convention	U002	d	treatment
DMP1Z63TG	2026-05-12 01:51:00	CDI-TAS	C001	Commune de Jijel	3344-314-18	INE	0.000	2.900	0.000	600.00	0.00	cancelled	rotation	U001	╪«┘å	treatment
DMOYH8QN5	2026-05-09 15:06:00	CET-JIJ	C001	Commune de Jijel	0067-318-18	MEN	66.000	5.000	61.000	850.00	51850.00	cancelled	convention	U001	┘å	treatment
DMOYHD6T6	2026-05-09 15:10:00	CET-TAH	C004	EURL COSIDER BTP Jijel	455-318-18	MEN	78.000	8.000	70.000	850.00	59500.00	settled	convention	U003	c	treatment
DMP9EWYCD	2026-05-17 06:46:00	CDI-TAS	CMP360T2M	┘ÄAPC JIJEL	0122-318-18	INE	45.000	8.000	37.000	0.00	0.00	settled	convention	U001		collect
DMP3RQYIP	2026-05-13 07:59:00	CDI-TAS	CMP11QW9I	zazra	1255-318-18	INE	15.000	2.000	13.000	1000.00	1000.00	settled	rotation	U001		treatment
DMP3RYNJK	2026-05-13 08:05:00	CDI-TAS	CMP360T2M	┘ÄAPC JIJEL	3444-318-18	INE	53.000	4.800	48.200	600.00	28920.00	settled	convention	UMOYN51KE		treatment
DMP3S1LRJ	2026-05-13 08:07:00	CDI-TAS	CMP11QW9I	zazra	5465-318-18	INE	48.000	4.500	43.500	1000.00	1000.00	settled	rotation	UMOYN51KE		treatment
DMP4JSJNG	2026-05-13 21:04:00	CET-TAH	C002	Commune de Taher	4445-314-18	MEN	43.000	3.000	40.000	850.00	34000.00	settled	convention	U003		treatment
DMP36PS6Q	2026-05-12 22:10:00	CET-JIJ	C004	EURL COSIDER BTP Jijel	4555-314-18	IND	99.000	5.000	94.000	1200.00	112800.00	settled	convention	U001	Corriger le centre 	treatment
DMOYT8ON2	2026-05-09 20:42:00	CET-ELM	C002	Commune de Taher	98962-318-18	MEN	56.000	4.000	52.000	850.00	44200.00	settled	convention	U001	d	treatment
DMOYN7JV0	2026-05-09 23:32:00	CET-TAH	C007	Entreprise Benali SARL	0324-323-18	MEN	0.000	0.000	0.000	850.00	0.00	cancelled	prepaid	U003	Le client n'existe plus.	treatment
DMOZOBSFM	2026-05-10 11:12:00	CET-JIJ	C001	Commune de Jijel	7889-312-18	MEN	0.000	0.000	0.000	850.00	0.00	cancelled	convention	U001	╪¬┘à 	treatment
DMP11RZ5X	2026-05-11 10:16:00	CET-ELM	CMP11QW9I	zazra	5455-318-18	IND	45.000	3.000	42.000	1200.00	50400.00	cancelled	rotation	U001	Tarifs r├⌐cement ajout├⌐	treatment
DMP9EYY29	2026-05-17 06:48:00	CET-JIJ	CMP360T2M	┘ÄAPC JIJEL	0122-318-18	MEN	45.000	8.000	37.000	2500.00	92500.00	settled	convention	U001		collect
DMP1DMWN6	2026-05-11 15:48:00	CET-JIJ	C001	Commune de Jijel	4444-318-18	MEN	0.000	0.000	0.000	850.00	0.00	cancelled	rotation	U001	╪«┘å	treatment
DMP1L3YBB	2026-05-11 19:18:00	CET-ELM	CMP11QW9I	zazra	145-316-18	MEN	33.000	4.000	29.000	850.00	24650.00	settled	rotation	U003	d	treatment
DMPA50FAQ	2026-05-17 18:57:00	CET-JIJ	C004	EURL COSIDER BTP Jijel	00092-317-18	MEN	45.000	9.000	36.000	2500.00	90000.00	settled	convention	U001		collect
DMP2ED1HB	2026-05-12 08:57:00	CET-JIJ	C001	Commune de Jijel	44555-318-18	MEN	45.000	2.000	43.000	850.00	36550.00	cancelled	convention	U001	ok	treatment
DMP2CWSYD	2026-05-12 08:16:00	CET-JIJ	CMP2CW5PP	Said bouroaih	0001-211-18	MEN	8.200	3.000	5.200	850.00	4420.00	paid	cash	U002	l	treatment
DMP2BCFDV	2026-05-12 07:32:00	CET-JIJ	C001	Commune de Jijel	356-324-19	MEN	5.000	5.000	0.000	850.00	0.00	cancelled	convention	U001	╪«┘å	treatment
DMP2AKVB3	2026-05-12 07:11:00	CET-JIJ	C001	Commune de Jijel	1836-317-18	IND	3.000	3.000	0.000	1200.00	0.00	cancelled	convention	U001	┘â	treatment
DMPA59GNK	2026-05-17 19:04:00	CDI-TAS	C008	Rachid Benbrahim	00092-317-18	INE	34.000	8.000	26.000	1000.00	26000.00	settled	convention	U001		collect
DMPBEM07E	2026-05-18 16:13:00	CET-JIJ	CMP360T2M	┘ÄAPC JIJEL	00092-317-18	MEN	55.000	9.000	46.000	2500.00	115000.00	settled	convention	U001		collect
DMPBG6K3I	2026-05-18 16:57:00	CET-JIJ	CMP360T2M	┘ÄAPC JIJEL	00092-317-18	MEN	66.000	9.000	57.000	2500.00	142500.00	settled	convention	U001		collect
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: ewgcet_db_user
--

COPY public.invoices (id, client_id, month, total_amount, paid_amount, status, generated_at, paid_at, note) FROM stdin;
FAC-202605-CMP2XDS0F	CMP2XDS0F	2026-05	41471.50	0.00	overdue	2026-05-12 22:13:52.689045	\N	
FAC-202605-C004	C004	2026-05	395817.80	0.00	overdue	2026-05-09 16:31:08.228692	\N	
FAC-202605-C008	C008	2026-05	78910.00	0.00	overdue	2026-05-12 22:13:41.92516	\N	
FAC-202605-CMP360T2M	CMP360T2M	2026-05	614045.95	0.00	pending	2026-05-12 22:13:49.512329	\N	
FAC--C002	C002		44200.00	44200.00	paid	2026-05-09 20:44:41.496277	2026-05-09 00:00:00	
FAC-202605-CMP11QW9I	CMP11QW9I	2026-05	83657.00	0.00	overdue	2026-05-12 22:13:45.355212	\N	
FAC-202605-C002	C002	2026-05	394200.00	44200.00	paid	2026-05-10 05:54:39.207351	2026-05-10 00:00:00	
FAC-202605-C001	C001	2026-05	306663.00	51850.00	paid	2026-05-09 18:21:18.553711	2026-05-09 00:00:00	
\.


--
-- Data for Name: sites; Type: TABLE DATA; Schema: public; Owner: ewgcet_db_user
--

COPY public.sites (id, name, type, region, capacity, used, status, active_since, manager, commune, localisation, accepted_waste) FROM stdin;
CDI-TAS	CDI Tasselemt	CDI	Tasselemt	50000000.00	89000.00	active	\N		Texanna	36.6833┬░ N, 6.1333┬░ E	["INE"]
CET-ELM	CET El Milia	CET	El Milia	30000000.00	198300.00	active	\N		El Milia	36.7500┬░ N, 6.5667┬░ E	["MEN", "IND"]
CET-JIJ	CET Jijel	CET	Jijel (Chef-lieu)	60000000.00	287400.00	active	\N		Jijel	36.8167┬░ N, 5.7667┬░ E	["MEN", "IND"]
CET-TAH	CET Taher	CET	Taher	40000000.00	156700.00	active	\N		Taher	36.7333┬░ N, 5.9000┬░ E	["MEN", "IND"]
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: ewgcet_db_user
--

COPY public.users (id, name, email, password, role, status, phone, matricule, site_id, created_at) FROM stdin;
U001	Directeur Administrateur	admin@ewgcet-jijel.dz	$2b$10$5AeKQWYSIFKhEuMP4o2xyOENgJhX1n7ScOtbkDlVG.DRZQJiAqpSG	admin	active	034 48 00 01	ADM-001	all	2024-01-15
U002	Karim Boudali	k.boudali@ewgcet-jijel.dz	$2b$10$teLeJc0ECxuhGjvdIW14WuM/UWyTxmPULqnGrWcU06001EDSK66Je	operator	active	0771 23 45 67	OP-2024-001	CET-JIJ	2024-03-10
U003	Sara Menacer	s.menacer@ewgcet-jijel.dz	$2b$10$ZPuwQjZEqs4p6N/7aDTqbOaj1QzDWYf4q.FxwV1HpU9z.44jPnEqS	operator	active	0773 45 67 89	OP-2024-002	CET-TAH	2024-03-10
U004	Yacine Ferhat	y.ferhat@ewgcet-jijel.dz	$2b$10$KwMFxlwOsiV.xapx5eQv4O5f1QfFxYVvK782/Gdyx0Vp4OoME40/q	operator	active	0774 56 78 90	OP-2026-003	CET-ELM	2024-04-20
UMOYN51KE	BADROU	bedro@hotmail.com	$2b$10$yjjf5nkSfRGkxnlpszUWfe.5F/Frhp1zFvHquKMAGa4kB1Dm4JLqW	operator	active	7777777	OP-1	CDI-TAS	2026-05-09
UMP5LM7G6	Anis menhar	anis.m@gmail.com	$2b$10$SZvVXdgVP5vcJ9RNzDAj0.gnqIjgC/WuEgEKzTxiJlhwlisL45hHu	operator	active	0666340987	OP-2026-005	CET-JIJ	2026-05-14
\.


--
-- Data for Name: waste_types; Type: TABLE DATA; Schema: public; Owner: ewgcet_db_user
--

COPY public.waste_types (id, label, price, unit, site_types, rotation_price, collect_price, collect_rotation_price) FROM stdin;
IND	Industriel (DIB)	1200.00	t	["CDM"]	1230.00	0.00	0.00
MED	M├⌐dical (DASRI)	2500.00	t	["CDM"]	1000.00	0.00	0.00
MEN	M├⌐nager (DMA)	850.00	t	["CDM"]	1000.00	2500.00	5000.00
INE	Inerte / BTP	600.00	t	["CDI", "CDM"]	1000.00	1000.00	2000.00
\.


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: ewgcet_db_user
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: company_trucks company_trucks_pkey; Type: CONSTRAINT; Schema: public; Owner: ewgcet_db_user
--

ALTER TABLE ONLY public.company_trucks
    ADD CONSTRAINT company_trucks_pkey PRIMARY KEY (id);


--
-- Name: discharges discharges_pkey; Type: CONSTRAINT; Schema: public; Owner: ewgcet_db_user
--

ALTER TABLE ONLY public.discharges
    ADD CONSTRAINT discharges_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_client_id_month_key; Type: CONSTRAINT; Schema: public; Owner: ewgcet_db_user
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_client_id_month_key UNIQUE (client_id, month);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: ewgcet_db_user
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: sites sites_pkey; Type: CONSTRAINT; Schema: public; Owner: ewgcet_db_user
--

ALTER TABLE ONLY public.sites
    ADD CONSTRAINT sites_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: ewgcet_db_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: ewgcet_db_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: waste_types waste_types_pkey; Type: CONSTRAINT; Schema: public; Owner: ewgcet_db_user
--

ALTER TABLE ONLY public.waste_types
    ADD CONSTRAINT waste_types_pkey PRIMARY KEY (id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON SEQUENCES TO ewgcet_db_user;


--
-- Name: DEFAULT PRIVILEGES FOR TYPES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON TYPES TO ewgcet_db_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON FUNCTIONS TO ewgcet_db_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON TABLES TO ewgcet_db_user;


--
-- PostgreSQL database dump complete
--

\unrestrict hMFGrPATuYqeixFWVWujlWsOtteBxs8AIBCWaIlzaY7Toch0r8Hd3uCS9KDbYNg

