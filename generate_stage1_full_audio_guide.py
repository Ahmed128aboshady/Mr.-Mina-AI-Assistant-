import json
import re
import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def build_full_stage1_audio_doc():
    doc = docx.Document()

    # Configure Margins (0.7 in)
    for section in doc.sections:
        section.top_margin = Inches(0.7)
        section.bottom_margin = Inches(0.7)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)

    def make_rtl(p):
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        pPr = p._p.get_or_add_pPr()
        bidi = OxmlElement('w:bidi')
        bidi.set(qn('w:val'), '1')
        pPr.append(bidi)

    def make_table_rtl(table):
        tblPr = table._tbl.tblPr
        bidiVisual = OxmlElement('w:bidiVisual')
        tblPr.append(bidiVisual)

    def set_cell_background(cell, fill_hex):
        shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
        cell._tc.get_or_add_tcPr().append(shading_elm)

    def set_cell_margins(cell, top=80, bottom=80, left=120, right=120):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = OxmlElement('w:tcMar')
        for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
            node = OxmlElement(f'w:{m}')
            node.set(qn('w:w'), str(val))
            node.set(qn('w:type'), 'dxa')
            tcMar.append(node)
        tcPr.append(tcMar)

    # ═══════════════════════════════════════════════════════════════
    # 🌟 الغلاف والترويسة
    # ═══════════════════════════════════════════════════════════════
    p_title = doc.add_paragraph()
    make_rtl(p_title)
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_title = p_title.add_run('🎙️ الدليل الشامل لكافة التسجيلات الصوتية المطلوبة للمرحلة الأولى\n(الصف الأول الإعدادي — علوم 2027)')
    r_title.font.name = 'Arial'
    r_title.font.size = Pt(18)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor(30, 58, 138) # Dark Navy

    p_sub = doc.add_paragraph()
    make_rtl(p_sub)
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_sub = p_sub.add_run('منصة «الخيميائي في العلوم» — دليل التسجيل والإلقاء الصوتي وتسمية الملفات')
    r_sub.font.name = 'Arial'
    r_sub.font.size = Pt(12)
    r_sub.font.bold = True
    r_sub.font.color.rgb = RGBColor(217, 119, 6) # Amber/Gold

    # ملخص إحصائي
    tbl_stats = doc.add_table(rows=1, cols=1)
    tbl_stats.alignment = WD_TABLE_ALIGNMENT.CENTER
    make_table_rtl(tbl_stats)
    cell_s = tbl_stats.cell(0, 0)
    set_cell_background(cell_s, 'F0F9FF')
    set_cell_margins(cell_s, top=140, bottom=140, left=180, right=180)

    p_s = cell_s.paragraphs[0]
    make_rtl(p_s)
    r_s_title = p_s.add_run('📊 ملخص إحصائي للتسجيلات الصوتية في المرحلة الأولى (132 تسجيلاً صوتياً):\n')
    r_s_title.font.name = 'Arial'
    r_s_title.font.size = Pt(11)
    r_s_title.font.bold = True
    r_s_title.font.color.rgb = RGBColor(3, 105, 161)

    r_s_text = p_s.add_run(
        '• شروحات الحصص الأساسية: 24 حصة عبر الوحدات الأربع (كل حصة ريكورد شامل للدرس).\n'
        '• بنك أسئلة «علل لما يأتي»: 84 سؤالاً تفاعلياً مع السبورة وأڤاتار المعلم.\n'
        '• تجارب المعمل الافتراضي 3D: 20 تسجيلاً (الذرات، الكثافة، الروابط، الخلايا، الكسوف والخسوف).\n'
        '• الترحيب والتحديات والاختبارات: 8 تسجيلات (الترحيب الرئيسي، الإجابة الصحيحة، التوجيه عند الخطأ، التهنئة بالدرجة النهائية 100%).\n\n'
        '💡 قاعدة التسمية لمنع أي تداخل (Zero Collision Naming Rule):\n'
        'تم اعتماد تسمية إنجليزية محددة لكل ملف كما هو موضح بالجدول (مثل: u1_l1_s1.mp3 أو why_u1_l1_s1_q1.mp3).\n'
        'بمجرد أن تقوم بتسجيل الملف بهذه التسمية، المنصة ستربطه في مكانه فوراً وتلقائياً دون أي تداخل إطلاقاً!'
    )
    r_s_text.font.name = 'Arial'
    r_s_text.font.size = Pt(10)
    r_s_text.font.color.rgb = RGBColor(51, 65, 85)

    doc.add_paragraph() # Spacer

    # ═══════════════════════════════════════════════════════════════
    # 🎯 القسم الأول: الترحيب والتحفيز والاختبارات (8 ملفات)
    # ═══════════════════════════════════════════════════════════════
    h1 = doc.add_paragraph()
    make_rtl(h1)
    r_h1 = h1.add_run('القسم الأول: الترحيب ومقدمات الحصص والاختبارات التفاعلية (8 ملفات)')
    r_h1.font.name = 'Arial'
    r_h1.font.size = Pt(14)
    r_h1.font.bold = True
    r_h1.font.color.rgb = RGBColor(30, 58, 138)

    p1_desc = doc.add_paragraph(); make_rtl(p1_desc)
    r1_d = p1_desc.add_run('هذه التسجيلات تمثل صوت الأڤاتار في الواجهة الرئيسية وأثناء خوض الطالب للاختبارات السريعة في نهاية كل حصة:')
    r1_d.font.name = 'Arial'; r1_d.font.size = Pt(10); r1_d.font.color.rgb = RGBColor(71, 85, 105)

    general_audio = [
        {
            'file': 'welcome_mr_mena.mp3',
            'context': 'الترحيب الرئيسي بالصفحة الرئيسية عند الضغط على أڤاتار المعلم',
            'script': '« أهلاً بيك يا دكتور أنا مستر مينا جرجس معلم العلوم ومساعدك الذكي! جاهز لشرح أي درس في المنهج، وتوضيح أي تجربة في المعمل، والإجابة على كل أسئلتك فوراً. يلا بينا نبدأ رحلة التفوق مع بعض! »'
        },
        {
            'file': 'intro_session_1.mp3',
            'context': 'المقدمة التفاعلية للحصة الأولى في أي درس',
            'script': '« أهلاً بيك يا بطل في الحصة الأولى! جهز كشكولك وقلمك وركز معايا في كل كلمة، هنفهم علوم أولى إعدادي بطريقة سهلة وممتعة ومبسطة جداً، يلا بينا! »'
        },
        {
            'file': 'intro_session_2.mp3',
            'context': 'المقدمة التفاعلية للحصة الثانية في أي درس',
            'script': '« يا مرحب بيك يا دكتور في الحصة التانية! جهز نفسك عشان هنكمل رحلتنا، ونحل مع بعض أفكار ومسائل الامتحانات ونطبق في المعمل التفاعلي سوا! »'
        },
        {
            'file': 'quiz_correct_1.mp3',
            'context': 'صوت التحفيز عند اختيار الطالب للإجابة الصحيحة (النمط 1)',
            'script': '« الله ينور عليك يا بطل! إجابة صحيحة وممتازة، تركيزك عالي جداً النهارده، استمر في التألق! »'
        },
        {
            'file': 'quiz_correct_2.mp3',
            'context': 'صوت التحفيز عند اختيار الطالب للإجابة الصحيحة (النمط 2)',
            'script': '« عاش يا دكتور! إجابة نموذجية وفي الجون، برافو عليك شرفتنا يا بطل! »'
        },
        {
            'file': 'quiz_wrong_1.mp3',
            'context': 'صوت التوجيه اللطيف عند اختيار إجابة خاطئة (النمط 1)',
            'script': '« ركز يا بطل! فكر في السؤال بهدوء، راجع القاعدة العلمية اللي شرحناها وحاول مرة تانية، أنا واثق إنك هتعرفها! »'
        },
        {
            'file': 'quiz_wrong_2.mp3',
            'context': 'صوت التوجيه اللطيف عند اختيار إجابة خاطئة (النمط 2)',
            'script': '« مش مشكلة خالص يا دكتور! العالم الشاطر بيتعلم من أخطائه، اقرأ السؤال بدقة وحاول تاني دلوقتي! »'
        },
        {
            'file': 'quiz_completed_perfect.mp3',
            'context': 'التهنئة الكبرى عند إنهاء اختبار الحصة بدرجة 100% كاملة',
            'script': '« ألف مبروك يا عبقري! جبت الدرجة النهائية 100% في التحدي! أداء أسطوري وتستاهل لقب دكتور العلوم بجدارة، فخور بيك جداً يا بطل! »'
        }
    ]

    tbl_g = doc.add_table(rows=1, cols=4)
    tbl_g.alignment = WD_TABLE_ALIGNMENT.CENTER
    make_table_rtl(tbl_g)
    for idx, col_name in enumerate(['م', 'اسم الملف المطلوب', 'موضع الصوت في المنصة', 'النص المقترح للتسجيل الصوتي']):
        set_cell_background(tbl_g.rows[0].cells[idx], '1E3A8A')
        p = tbl_g.rows[0].cells[idx].paragraphs[0]; make_rtl(p)
        r = p.add_run(col_name); r.font.bold = True; r.font.name = 'Arial'; r.font.size = Pt(10); r.font.color.rgb = RGBColor(255, 255, 255)

    tbl_g.columns[0].width = Inches(0.4)
    tbl_g.columns[1].width = Inches(1.8)
    tbl_g.columns[2].width = Inches(1.8)
    tbl_g.columns[3].width = Inches(3.2)

    for idx, item in enumerate(general_audio):
        row_c = tbl_g.add_row().cells
        p0 = row_c[0].paragraphs[0]; make_rtl(p0); p0.add_run(str(idx + 1)).font.bold = True
        p1 = row_c[1].paragraphs[0]; make_rtl(p1); r1 = p1.add_run(item['file']); r1.font.bold = True; r1.font.color.rgb = RGBColor(2, 132, 199)
        p2 = row_c[2].paragraphs[0]; make_rtl(p2); p2.add_run(item['context']).font.size = Pt(9.5)
        p3 = row_c[3].paragraphs[0]; make_rtl(p3); p3.add_run(item['script']).font.size = Pt(9.5)
        bg = 'F8FAFC' if (idx % 2 == 1) else 'FFFFFF'
        for c in row_c:
            set_cell_background(c, bg)
            set_cell_margins(c)

    doc.add_paragraph() # Spacer

    # ═══════════════════════════════════════════════════════════════
    # 🔬 القسم الثاني: المعمل الافتراضي 3D (20 تسجيلاً)
    # ═══════════════════════════════════════════════════════════════
    h2 = doc.add_paragraph()
    make_rtl(h2)
    r_h2 = h2.add_run('القسم الثاني: تجارب ومجسمات المعمل الافتراضي 3D (20 تسجيلاً)')
    r_h2.font.name = 'Arial'
    r_h2.font.size = Pt(14)
    r_h2.font.bold = True
    r_h2.font.color.rgb = RGBColor(30, 58, 138)

    p2_desc = doc.add_paragraph(); make_rtl(p2_desc)
    r2_d = p2_desc.add_run('هذه التسجيلات تعمل بصوت مستر مينا عندما يتفاعل الطالب مع الأدوات ثلاثية الأبعاد (بناء الذرات، اختبارات الطفو، فحص الخلايا، الروابط، الكسوف والخسوف):')
    r2_d.font.name = 'Arial'; r2_d.font.size = Pt(10); r2_d.font.color.rgb = RGBColor(71, 85, 105)

    lab_audio = [
        # بناء الذرات
        {'file': 'lab_atom_H.mp3', 'cat': 'بناء الذرات', 'title': 'ذرة الهيدروجين (H)', 'script': '« ذرة الهيدروجين H هي أبسط ذرة في الكون! نواتها فيها بروتون واحد بس وبدون أي نيوترونات، وبيدور حواليها إلكترون واحد في المستوى K! »'},
        {'file': 'lab_atom_He.mp3', 'cat': 'بناء الذرات', 'title': 'ذرة الهيليوم (He)', 'script': '« ذرة الهيليوم He غاز خامل نبيل، نواتها فيها 2 بروتون و2 نيوترون، ومستوى طاقتها الوحيد K مكتمل بـ 2 إلكترون عشان كده مستقرة ومبتتفاعلش! »'},
        {'file': 'lab_atom_C.mp3', 'cat': 'بناء الذرات', 'title': 'ذرة الكربون (C)', 'script': '« ذرة الكربون C أساس كل الكائنات الحية! عدده الذري 6 وكتلته 12، توزيعه 2 في المستوى K و 4 في المستوى L، وبيقدر يعمل 4 روابط تساهمية قوية! »'},
        {'file': 'lab_atom_O.mp3', 'cat': 'بناء الذرات', 'title': 'ذرة الأكسجين (O)', 'script': '« ذرة الأكسجين O سر التنفس والحياة! عدده الذري 8، توزيعه 2 في K و 6 في L، ولازم يكتسب أو يشارك بـ 2 إلكترون عشان يكمل مستواه الخارجي بـ 8 ويستقر! »'},
        {'file': 'lab_atom_Na.mp3', 'cat': 'بناء الذرات', 'title': 'ذرة الصوديوم (Na)', 'script': '« ذرة الصوديوم Na فلز نشط جداً عدده الذري 11، توزيعه 2 في K و 8 في L و 1 في M! بيميل إنه يفقد الإلكترون الأخير بسهولة ويتحول لأيون موجب Na⁺! »'},
        # حوض الكثافة والطفو
        {'file': 'lab_density_wood.mp3', 'cat': 'حوض الكثافة', 'title': 'قطعة الخشب', 'script': '« الخشب كثافته أقل من كثافة الماء (1 جم/سم³)، عشان كده بيطفو الخشب فوق سطح الماء ومبيغوصش في القاع أبداً! »'},
        {'file': 'lab_density_cork.mp3', 'cat': 'حوض الكثافة', 'title': 'قطعة الفلين', 'script': '« الفلين مادة مسامية خفيفة جداً مليانة هواء وكثافتها أقل بكتير من كثافة الماء، عشان كده بيطفو الفلين بثبات عالي فوق سطح الماء! »'},
        {'file': 'lab_density_oil.mp3', 'cat': 'حوض الكثافة', 'title': 'بقعة الزيت', 'script': '« الزيت كثافته أقل من كثافة الماء، عشان كده بيطفو الزيت فوق سطح الماء! وده يفسر سر خطير في الامتحانات: ليه حرائق البترول لا تطفأ بالماء لأن الزيت بيطفو ويستمر في الاشتعال! »'},
        {'file': 'lab_density_iron.mp3', 'cat': 'حوض الكثافة', 'title': 'مسمار الحديد', 'script': '« الحديد مادة ثقيلة وكثافتها أكبر بكتير من كثافة الماء (حوالي 7.8 جم/سم³)، عشان كده مسمار الحديد بيهبط ويغوص لقاع الحوض فوراً! »'},
        # الروابط الكيميائية
        {'file': 'lab_bond_ionic.mp3', 'cat': 'الروابط الكيميائية', 'title': 'الرابطة الأيونية (ملح الطعام NaCl)', 'script': '« الرابطة الأيونية بتنشأ نتيجة تجاذب كهربي قوي بين أيون موجب لفلز فقد إلكترون زي الصوديوم Na⁺، وأيون سالب للا فلز اكتسب إلكترون زي الكلور Cl⁻، فبيدونا بلورة ملح الطعام NaCl! »'},
        {'file': 'lab_bond_covalent.mp3', 'cat': 'الروابط الكيميائية', 'title': 'الرابطة التساهمية (جزيء الماء H2O)', 'script': '« الرابطة التساهمية بتنشأ بين اللافلزات عن طريق مشاركة كل ذرة بعدد من الإلكترونات! في جزيء الماء H2O، ذرة الأكسجين بتشارك بإلكترون مع كل ذرة هيدروجين، فتعمل رابطتين تساهميتين أحاديتين! »'},
        # فحص الخلايا بالمجهر
        {'file': 'lab_cell_plant.mp3', 'cat': 'المجهر الافتراضي', 'title': 'الخلية النباتية', 'script': '« الخلية النباتية وحدة بناء النبات، بتتميز بوجود جدار خلوي قوي من السليلوز بيديها شكلاً ثابتاً، وبلاستيدات خضراء للبناء الضوئي، وفجوة عصارية مركزية عملاقة! »'},
        {'file': 'lab_cell_animal.mp3', 'cat': 'المجهر الافتراضي', 'title': 'الخلية الحيوانية', 'script': '« الخلية الحيوانية وحدة بناء جسم الحيوان والإنسان! محاطة بغشاء بلازمي مرن ومفيهاش جدار خلوي، وبتتميز بوجود الجسم المركزي السنتروسوم لانقسام الخلية! »'},
        {'file': 'lab_cell_nucleus.mp3', 'cat': 'عضيات الخلية', 'title': 'النواة والنوية (مركز التحكم)', 'script': '« النواة هي عقل ومركز تحكم الخلية! بتحتوي على المادة الوراثية DNA والكروموسومات اللي بتنقل صفاتك الوراثية، ومسؤولة عن تنظيم كل أنشطة الخلية وانقسامها! »'},
        {'file': 'lab_cell_chloro.mp3', 'cat': 'عضيات الخلية', 'title': 'البلاستيدات الخضراء', 'script': '« البلاستيدات الخضراء دي مصنع أكل النبات! فيها صبغة الكلوروفيل الخضراء اللي بتمتص طاقة ضوء الشمس عشان تعمل عملية البناء الضوئي وتنتج سكر الجلوكوز وغاز الأكسجين! »'},
        {'file': 'lab_cell_vacuole.mp3', 'cat': 'عضيات الخلية', 'title': 'الفجوة العصارية الكبيرة', 'script': '« الفجوة العصارية في الخلية النباتية فجوة عملاقة بتشغل معظم مساحة الخلية! وظيفتها تخزين المية والأملاح والمواد الغذائية وبتدي الخلية امتلاءها ودعامتها! »'},
        {'file': 'lab_cell_mito.mp3', 'cat': 'عضيات الخلية', 'title': 'الميتوكوندريا (محطات الطاقة)', 'script': '« الميتوكوندريا هي محطة توليد الكهرباء والطاقة في الخلية! بيحصل فيها التنفس الخلوي وأكسدة الغذاء لإنتاج جزيئات الطاقة ATP اللي بتشغل كل أجهزة جسمك! »'},
        {'file': 'lab_cell_centro.mp3', 'cat': 'عضيات الخلية', 'title': 'الجسم المركزي (السنتروسوم)', 'script': '« السنتروسوم أو الجسم المركزي موجود بس في الخلية الحيوانية ومش موجود في النبات! بيتكون من حبيبتين اسمهم سنتريولان، وليه دور خطير في تكوين خيوط المغزل أثناء انقسام الخلية! »'},
        # الظواهر الفلكية
        {'file': 'lab_eclipse_solar.mp3', 'cat': 'الفلك 3D', 'title': 'كسوف الشمس', 'script': '« ظاهرة كسوف الشمس بتحصل بالنهار لما يقع القمر بين الشمس والأرض على خط استقامة واحد، فيحجب ضوء الشمس كلياً أو جزئياً! وخطير جداً النظر إليه بدون نظارات واقية متخصصة! »'},
        {'file': 'lab_eclipse_lunar.mp3', 'cat': 'الفلك 3D', 'title': 'خسوف القمر', 'script': '« ظاهرة خسوف القمر بتحصل بالليل لما تقع الأرض بين الشمس والقمر على خط استقامة واحد، فتحجب الأرض ضوء الشمس عن القمر وبيظهر باللون الأحمر القرمزي، وآمن تماماً للعين! »'}
    ]

    tbl_l = doc.add_table(rows=1, cols=4)
    tbl_l.alignment = WD_TABLE_ALIGNMENT.CENTER
    make_table_rtl(tbl_l)
    for idx, col_name in enumerate(['م', 'اسم الملف المطلوب', 'التجربة / الأداة', 'النص المقترح للتسجيل الصوتي']):
        set_cell_background(tbl_l.rows[0].cells[idx], '0284C7')
        p = tbl_l.rows[0].cells[idx].paragraphs[0]; make_rtl(p)
        r = p.add_run(col_name); r.font.bold = True; r.font.name = 'Arial'; r.font.size = Pt(10); r.font.color.rgb = RGBColor(255, 255, 255)

    tbl_l.columns[0].width = Inches(0.4)
    tbl_l.columns[1].width = Inches(1.8)
    tbl_l.columns[2].width = Inches(1.8)
    tbl_l.columns[3].width = Inches(3.2)

    for idx, item in enumerate(lab_audio):
        row_c = tbl_l.add_row().cells
        p0 = row_c[0].paragraphs[0]; make_rtl(p0); p0.add_run(str(idx + 1)).font.bold = True
        p1 = row_c[1].paragraphs[0]; make_rtl(p1); r1 = p1.add_run(item['file']); r1.font.bold = True; r1.font.color.rgb = RGBColor(2, 132, 199)
        p2 = row_c[2].paragraphs[0]; make_rtl(p2); p2.add_run(f"{item['cat']} — {item['title']}").font.size = Pt(9.5)
        p3 = row_c[3].paragraphs[0]; make_rtl(p3); p3.add_run(item['script']).font.size = Pt(9.5)
        bg = 'F8FAFC' if (idx % 2 == 1) else 'FFFFFF'
        for c in row_c:
            set_cell_background(c, bg)
            set_cell_margins(c)

    doc.add_paragraph() # Spacer

    # ═══════════════════════════════════════════════════════════════
    # 📚 القسم الثالث: شروحات الحصص الأساسية الـ 24 (شرح المنهج كاملاً)
    # ═══════════════════════════════════════════════════════════════
    h3 = doc.add_paragraph()
    make_rtl(h3)
    r_h3 = h3.add_run('القسم الثالث: شروحات الحصص الأساسية الـ 24 عبر الوحدات الأربع (المنهج كاملاً)')
    r_h3.font.name = 'Arial'
    r_h3.font.size = Pt(14)
    r_h3.font.bold = True
    r_h3.font.color.rgb = RGBColor(30, 58, 138)

    p3_desc = doc.add_paragraph(); make_rtl(p3_desc)
    r3_d = p3_desc.add_run('هذه التسجيلات تمثل الشرح الصوتي الرئيسي لكل حصة على حدة، يلقيها المعلم بأسلوبه الحماسي التعليمي المشوق:')
    r3_d.font.name = 'Arial'; r3_d.font.size = Pt(10); r3_d.font.color.rgb = RGBColor(71, 85, 105)

    # Read curriculum sessions
    with open(r'D:\Mina\app\js\curriculum_data.js', 'r', encoding='utf-8') as f:
        text = f.read()
    m = re.search(r'window\.CURRICULUM_GRADE_1\s*=\s*(\{.*?\});', text, re.DOTALL)
    curr = json.loads(m.group(1))

    sess_counter = 1
    for u_idx, u in enumerate(curr.get('units', [])):
        u_num = u_idx + 1
        u_title = u.get('title')

        p_u = doc.add_paragraph(); make_rtl(p_u)
        r_u = p_u.add_run(f"📂 {u_title}")
        r_u.font.name = 'Arial'; r_u.font.size = Pt(12); r_u.font.bold = True; r_u.font.color.rgb = RGBColor(217, 119, 6)

        for l_idx, l in enumerate(u.get('lessons', [])):
            l_num = l_idx + 1
            l_title = l.get('title')
            l_id = l.get('lessonId')
            prefix = '_'.join(l_id.split('_')[:2])

            for s_idx, s in enumerate(l.get('sessions', [])):
                s_num = s_idx + 1
                s_title = s.get('title')
                s_file = f"{prefix}_s{s_num}.mp3"
                s_spoken = s.get('spokenEgyptian') or s.get('summary') or ''

                tbl_sess = doc.add_table(rows=3, cols=2)
                tbl_sess.alignment = WD_TABLE_ALIGNMENT.CENTER
                make_table_rtl(tbl_sess)

                # Header
                c_head = tbl_sess.cell(0, 0); c_head.merge(tbl_sess.cell(0, 1))
                set_cell_background(c_head, '1E3A8A')
                p_sh = c_head.paragraphs[0]; make_rtl(p_sh)
                r_sh = p_sh.add_run(f"حصة رقم ({sess_counter}) — اسم الملف: {s_file} — {l_title}")
                r_sh.font.bold = True; r_sh.font.name = 'Arial'; r_sh.font.size = Pt(10.5); r_sh.font.color.rgb = RGBColor(255, 255, 255)

                # Row 1: Session Title
                c_lbl1 = tbl_sess.cell(1, 0); c_val1 = tbl_sess.cell(1, 1)
                set_cell_background(c_lbl1, 'F1F5F9')
                p_l1 = c_lbl1.paragraphs[0]; make_rtl(p_l1); p_l1.add_run('عنوان الحصة:').font.bold = True
                p_v1 = c_val1.paragraphs[0]; make_rtl(p_v1); r_v1 = p_v1.add_run(s_title); r_v1.font.bold = True; r_v1.font.color.rgb = RGBColor(15, 23, 42)

                # Row 2: Spoken text
                c_lbl2 = tbl_sess.cell(2, 0); c_val2 = tbl_sess.cell(2, 1)
                set_cell_background(c_lbl2, 'EFF6FF'); set_cell_background(c_val2, 'FFFFFF')
                p_l2 = c_lbl2.paragraphs[0]; make_rtl(p_l2)
                r_l2 = p_l2.add_run('نص الإلقاء الصوتي المقترح\n(بالعامية الحماسية):'); r_l2.font.bold = True; r_l2.font.color.rgb = RGBColor(2, 132, 199)
                p_v2 = c_val2.paragraphs[0]; make_rtl(p_v2)
                r_v2 = p_v2.add_run(f"« {s_spoken} »"); r_v2.font.size = Pt(9.5)

                tbl_sess.columns[0].width = Inches(1.8)
                tbl_sess.columns[1].width = Inches(5.4)

                for row in tbl_sess.rows:
                    for cell in row.cells:
                        set_cell_margins(cell, top=70, bottom=70, left=100, right=100)

                doc.add_paragraph() # Spacer between session cards
                sess_counter += 1

    # ═══════════════════════════════════════════════════════════════
    # ❓ القسم الرابع: بنك أسئلة «علل لما يأتي» التفاعلية الـ 84 كاملة
    # ═══════════════════════════════════════════════════════════════
    h4 = doc.add_paragraph()
    make_rtl(h4)
    r_h4 = h4.add_run('القسم الرابع: بنك أسئلة «علل لما يأتي» التفاعلية الـ 84 كاملة (مع السبورة الذكية)')
    r_h4.font.name = 'Arial'
    r_h4.font.size = Pt(14)
    r_h4.font.bold = True
    r_h4.font.color.rgb = RGBColor(30, 58, 138)

    p4_desc = doc.add_paragraph(); make_rtl(p4_desc)
    r4_d = p4_desc.add_run(
        'في هذا القسم تجد كافة أسئلة «علل» المقررة في المنهج بالكامل (84 سؤالاً مرتبة حسب الوحدات والدروس والحصص).\n'
        '• طريقة التسمية الكودية: why_u{الوحدة}_l{الدرس}_s{الحصة}_q{رقم السؤال}.mp3 (مثل: why_u1_l1_s1_q1.mp3).\n'
        '• طريقة التسجيل المقترحة: قراءة السؤال بصوت واضح ثم قراءة الإجابة النموذجية المعتمدة بالشرح المبسط السهل الممتنع.'
    )
    r4_d.font.name = 'Arial'; r4_d.font.size = Pt(10); r4_d.font.color.rgb = RGBColor(71, 85, 105)

    q_global_counter = 1
    for u_idx, u in enumerate(curr.get('units', [])):
        u_num = u_idx + 1
        u_title = u.get('title')

        p_uq = doc.add_paragraph(); make_rtl(p_uq)
        r_uq = p_uq.add_run(f"📌 {u_title}")
        r_uq.font.name = 'Arial'; r_uq.font.size = Pt(12); r_uq.font.bold = True; r_uq.font.color.rgb = RGBColor(217, 119, 6)

        for l_idx, l in enumerate(u.get('lessons', [])):
            l_num = l_idx + 1
            l_title = l.get('title')

            for s_idx, s in enumerate(l.get('sessions', [])):
                s_num = s_idx + 1
                s_title = s.get('title')
                why_list = s.get('whyQuestions', [])

                if not why_list:
                    continue

                p_sh = doc.add_paragraph(); make_rtl(p_sh)
                r_sh = p_sh.add_run(f"🔹 {l_title} ➔ {s_title} ({len(why_list)} أسئلة علل):")
                r_sh.font.name = 'Arial'; r_sh.font.size = Pt(10.5); r_sh.font.bold = True; r_sh.font.color.rgb = RGBColor(30, 58, 138)

                tbl_why = doc.add_table(rows=1, cols=4)
                tbl_why.alignment = WD_TABLE_ALIGNMENT.CENTER
                make_table_rtl(tbl_why)

                for c_idx, col_title in enumerate(['م', 'اسم الملف الموحد', 'سؤال علل المطلوب', 'الإجابة النموذجية للشرح الصوتي']):
                    cell = tbl_why.rows[0].cells[c_idx]
                    set_cell_background(cell, '1E293B')
                    p = cell.paragraphs[0]; make_rtl(p)
                    r = p.add_run(col_title); r.font.bold = True; r.font.name = 'Arial'; r.font.size = Pt(9.5); r.font.color.rgb = RGBColor(255, 255, 255)

                tbl_why.columns[0].width = Inches(0.4)
                tbl_why.columns[1].width = Inches(1.8)
                tbl_why.columns[2].width = Inches(2.2)
                tbl_why.columns[3].width = Inches(2.8)

                for w_idx, wq in enumerate(why_list):
                    q_num = w_idx + 1
                    # Filename: standard code
                    fname = f"why_u{u_num}_l{l_num}_s{s_num}_q{q_num}.mp3"
                    if wq.get('audio'):
                        # Keep alias in mind
                        fname = f"{fname} (أو {wq.get('audio')}.mp3)"

                    row_c = tbl_why.add_row().cells
                    p0 = row_c[0].paragraphs[0]; make_rtl(p0); p0.add_run(str(q_global_counter)).font.bold = True
                    p1 = row_c[1].paragraphs[0]; make_rtl(p1); r1 = p1.add_run(fname); r1.font.bold = True; r1.font.size = Pt(8.5); r1.font.color.rgb = RGBColor(2, 132, 199)
                    p2 = row_c[2].paragraphs[0]; make_rtl(p2); r2 = p2.add_run(wq.get('q')); r2.font.bold = True; r2.font.size = Pt(9); r2.font.color.rgb = RGBColor(15, 23, 42)
                    p3 = row_c[3].paragraphs[0]; make_rtl(p3); r3 = p3.add_run(wq.get('a')); r3.font.size = Pt(9); r3.font.color.rgb = RGBColor(51, 65, 85)

                    bg = 'F8FAFC' if (q_global_counter % 2 == 1) else 'FFFFFF'
                    for c in row_c:
                        set_cell_background(c, bg)
                        set_cell_margins(c, top=50, bottom=50, left=70, right=70)

                    q_global_counter += 1

                doc.add_paragraph() # Spacer

    out_file_1 = r'D:\Mina\دليل_تسجيلات_المرحلة_الأولى_الكامل_الصف_الأول_الإعدادي_2027.docx'
    out_file_2 = r'D:\Mina\app\دليل_تسجيلات_المرحلة_الأولى_الكامل_الصف_الأول_الإعدادي_2027.docx'

    doc.save(out_file_1)
    doc.save(out_file_2)
    print(f"Generated successfully: {out_file_1}")
    print(f"Total Why Questions: {q_global_counter - 1}")
    print(f"Total Sessions: {sess_counter - 1}")
    print(f"Total Lab Elements: {len(lab_audio)}")
    print(f"Total General/Quiz: {len(general_audio)}")
    print(f"Grand Total Recordings: {(q_global_counter - 1) + (sess_counter - 1) + len(lab_audio) + len(general_audio)}")

if __name__ == '__main__':
    build_full_stage1_audio_doc()
