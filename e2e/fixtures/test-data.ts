export const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestSQA2026!';

export const TEST_USERS = {
  admin: {
    cedula: 'V-88880001',
    password: TEST_PASSWORD,
    role: 'Administrador',
  },
  estudiante: {
    cedula: 'V-88880002',
    password: TEST_PASSWORD,
    role: 'Estudiante',
  },
  coordinador: {
    cedula: 'V-88880003',
    password: TEST_PASSWORD,
    role: 'Coordinador',
  },
} as const;

export function generateUniqueCedula(): string {
  const ts = Date.now().toString().slice(-8);
  return `V-99${ts}`;
}

export const TEST_APPLICANT_FIELDS = {
  nombres: 'María José',
  apellidos: 'González Pérez',
  fecha_nacimiento: '1990-05-15',
  sexo: 'Femenino' as const,
  estado_civil: 'Soltero/a' as const,
  correo_electronico: 'maria.test@example.com',
  telefono_celular: '0412-1234567',
  estado: 'Distrito Capital',
  municipio: 'Libertador',
  parroquia: 'Catedral',
} as const;

export const TEST_CASE = {
  sintesis: 'Caso de prueba E2E — verificación automatizada',
};