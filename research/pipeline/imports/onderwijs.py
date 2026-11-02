"""Normaliseer bestaande DUO-opleidingsrijen; behoud afscherming en dimensies."""
from .common import rows, year, count


def import_education(path):
    level = next((level for level in ('mbo', 'hbo', 'wo')
                 if f'_{level}_' in path.name), None)
    if level is None:
        raise ValueError('Onbekend onderwijsniveau')
    result = []
    for row in rows(path):
        course_key = 'OPLEIDINGSCODE ACTUEEL' if level != 'mbo' else 'BEROEPSOPLEIDING CODE'
        # Mbo gebruikt de oorspronkelijke CREBO-/kwalificatiekolom; alle dimensies blijven behouden.
        if level == 'mbo':
            course_key = next((k for k in row if 'code' in k.lower() and (
                'opleiding' in k.lower() or 'kwalificatie' in k.lower())), '')
        course = row.get(course_key, '')
        if not course or not course.isdigit():
            raise ValueError(f'Opleidingscode ontbreekt: {course_key}')
        if level != 'mbo' and row.get('PROVINCIE') != 'Friesland':
            raise ValueError('Onverwachte geografische dekking')
        result.append(dict(level=level, course_code=course, year=year(row['Jaar']),
                           value=count(row['Aantal']), raw_value=row['Aantal'], status='observed',
                           geography='Instellingen met Friese locaties, inclusief buiten Fryslân' if level == 'mbo' else 'Instellingen in Fryslân',
                           classification='DUO opleidingscode', source=path.as_posix(), dimensions=row))
    return result
