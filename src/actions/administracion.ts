'use server';

import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { hashPassword, getSession } from '@/lib/auth-utils';
import { verificarPermisoAlumno } from '@/lib/permissions';

// ============================================================================
// USUARIOS
// ============================================================================

export interface Usuario {
    id: string; // cedula_usuario
    user: string; // nombres + apellidos
    role: string;
    cedulaPrefix: string;
    cedulaNumber: string;
    nombres: string;
    apellidos: string;
    correo: string;
    sexo: 'M' | 'F';
    telefonoLocal?: string;
    telefonoCelular?: string;
    status: string; // activo
    term?: string;
    tipoParticipacion?: string;
}

export async function getUsuarios() {
    try {
        const result = await query(`
            SELECT 
                u.cedula_usuario as id,
                u.nombres || ' ' || u.apellidos as user,
                u.rol as role,
                CASE 
                    WHEN SUBSTRING(u.cedula_usuario, 1, 1) = 'V' THEN 'V'
                    WHEN SUBSTRING(u.cedula_usuario, 1, 1) = 'E' THEN 'E'
                    ELSE 'V'
                END as "cedulaPrefix",
                CASE 
                    WHEN POSITION('-' IN u.cedula_usuario) > 0 
                    THEN SUBSTRING(u.cedula_usuario FROM POSITION('-' IN u.cedula_usuario) + 1)
                    ELSE SUBSTRING(u.cedula_usuario FROM 2)
                END as "cedulaNumber",
                u.nombres,
                u.apellidos,
                u.correo_electronico as correo,
                'M' as sexo,
                u.telefono_local as "telefonoLocal",
                u.telefono_celular as "telefonoCelular",
                CASE WHEN u.activo THEN 'Activo' ELSE 'Inactivo' END as status,
                (
                    SELECT STRING_AGG(DISTINCT p.term, ', ')
                    FROM (
                        SELECT term FROM Alumnos WHERE cedula_alumno = u.cedula_usuario
                        UNION
                        SELECT term FROM Profesores WHERE cedula_profesor = u.cedula_usuario
                    ) p
                ) as semesters
            FROM Usuarios_Sistema u
            ORDER BY u.activo DESC, u.nombres, u.apellidos
        `);
        return { success: true, data: result.rows };
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        return { success: false, error: 'Error al obtener usuarios' };
    }
}

export async function getUsuarioById(id: string) {
    try {
        // Verificar permisos - alumnos solo pueden ver su propia información
        const permiso = await verificarPermisoAlumno('ver', 'usuario', { cedula: id });
        if (!permiso.allowed) {
            return { success: false, error: permiso.error || 'No tienes permisos para ver este usuario' };
        }

        const result = await query(`
            SELECT 
                cedula_usuario as id,
                nombres,
                apellidos,
                correo_electronico as correo,
                telefono_local as "telefonoLocal",
                telefono_celular as "telefonoCelular",
                rol as role,
                activo as status,
                CASE 
                    WHEN SUBSTRING(cedula_usuario, 1, 1) = 'V' THEN 'V'
                    WHEN SUBSTRING(cedula_usuario, 1, 1) = 'E' THEN 'E'
                    ELSE 'V'
                END as "cedulaPrefix",
                CASE 
                    WHEN POSITION('-' IN cedula_usuario) > 0 
                    THEN SUBSTRING(cedula_usuario FROM POSITION('-' IN cedula_usuario) + 1)
                    ELSE SUBSTRING(cedula_usuario FROM 2)
                END as "cedulaNumber"
            FROM Usuarios_Sistema
            WHERE cedula_usuario = $1
        `, [id]);

        if (result.rows.length === 0) {
            return { success: false, error: 'Usuario no encontrado' };
        }

        return { success: true, data: result.rows[0] };
    } catch (error) {
        console.error('Error al obtener usuario por ID:', error);
        return { success: false, error: 'Error al obtener usuario' };
    }
}

export async function createUsuario(data: Partial<Usuario> & { password?: string }) {
    try {
        const cedula = `${data.cedulaPrefix}-${data.cedulaNumber}`;
        const contrasena_hash = data.password ? await hashPassword(data.password) : null;
        await query('BEGIN');

        // Verificar si el usuario ya existe
        const existingUser = await query('SELECT cedula_usuario, rol FROM Usuarios_Sistema WHERE cedula_usuario = $1', [cedula]);

        if (existingUser.rows.length > 0) {
            // VALIDACIÓN: Conflicto de roles
            const existingRole = existingUser.rows[0].rol;
            if (data.role && data.role !== existingRole) {
                await query('ROLLBACK');
                return {
                    success: false,
                    error: `El usuario ya existe con el rol de ${existingRole}. No se puede cambiar el rol mediante este proceso.`
                };
            }

            // Actualizar usuario existente
            const updateFields: string[] = [];
            const updateValues: any[] = [];
            let i = 1;

            if (data.nombres) { updateFields.push(`nombres = $${i++}`); updateValues.push(data.nombres); }
            if (data.apellidos) { updateFields.push(`apellidos = $${i++}`); updateValues.push(data.apellidos); }
            if (data.correo) { updateFields.push(`correo_electronico = $${i++}`); updateValues.push(data.correo); }
            if (data.telefonoLocal) { updateFields.push(`telefono_local = $${i++}`); updateValues.push(data.telefonoLocal); }
            if (data.telefonoCelular) { updateFields.push(`telefono_celular = $${i++}`); updateValues.push(data.telefonoCelular); }
            // if (data.role) { updateFields.push(`rol = $${i++}`); updateValues.push(data.role); } // Ya validamos que sea el mismo
            if (contrasena_hash) { updateFields.push(`contrasena_hash = $${i++}`); updateValues.push(contrasena_hash); }

            if (updateFields.length > 0) {
                updateValues.push(cedula);
                await query(`
                    UPDATE Usuarios_Sistema 
                    SET ${updateFields.join(', ')} 
                    WHERE cedula_usuario = $${i}
                `, updateValues);
            }
        } else {
            // Crear nuevo usuario
            if (!data.password) {
                throw new Error('La contraseña es requerida para nuevos usuarios');
            }
            await query(`
                INSERT INTO Usuarios_Sistema (
                    cedula_usuario, correo_electronico, contrasena_hash,
                    nombres, apellidos, telefono_celular, telefono_local,
                    rol, activo
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                cedula,
                data.correo,
                contrasena_hash,
                data.nombres,
                data.apellidos,
                data.telefonoCelular || null,
                data.telefonoLocal || null,
                data.role || 'Estudiante',
                true
            ]);
        }

        // Manejar participación record
        const role = data.role || 'Estudiante';
        if ((role === 'Estudiante' || role === 'Profesor') && data.term && data.tipoParticipacion) {
            if (role === 'Estudiante') {
                // Verificar si ya tiene participación en ese semestre
                const existingPart = await query('SELECT * FROM Alumnos WHERE cedula_alumno = $1 AND term = $2', [cedula, data.term]);
                if (existingPart.rows.length > 0) {
                    await query('ROLLBACK');
                    return {
                        success: false,
                        error: `El usuario ya se encuentra registrado en el semestre ${data.term}.`
                    };
                } else {
                    await query('INSERT INTO Alumnos (cedula_alumno, term, tipo) VALUES ($1, $2, $3)', [cedula, data.term, data.tipoParticipacion]);
                }
            } else if (role === 'Profesor') {
                const existingPart = await query('SELECT * FROM Profesores WHERE cedula_profesor = $1 AND term = $2', [cedula, data.term]);
                if (existingPart.rows.length > 0) {
                    await query('ROLLBACK');
                    return {
                        success: false,
                        error: `El usuario ya se encuentra registrado en el semestre ${data.term}.`
                    };
                } else {
                    await query('INSERT INTO Profesores (cedula_profesor, term, tipo) VALUES ($1, $2, $3)', [cedula, data.term, data.tipoParticipacion]);
                }
            }
        }

        await query('COMMIT');
        revalidatePath('/administration');
        return { success: true };
    } catch (error: any) {
        await query('ROLLBACK');
        console.error('Error al crear/actualizar usuario:', error);
        return { success: false, error: error.message || 'Error al procesar usuario' };
    }
}

export async function updateUsuario(id: string, data: Partial<Usuario> & { password?: string }) {
    try {
        // Verificar permisos - alumnos solo pueden editar su propia información
        const permiso = await verificarPermisoAlumno('editar', 'usuario', { cedula: id });
        if (!permiso.allowed) {
            return { success: false, error: permiso.error || 'No tienes permisos para editar este usuario' };
        }

        // Si es alumno, no puede cambiar su rol o estado
        const session = await getSession();
        if (session?.rol === 'Estudiante' && id === session.cedula) {
            // Remover campos que no puede modificar
            if (data.role) {
                delete data.role;
            }
            if (data.status) {
                delete data.status;
            }
        }

        // Obtener datos actuales para auditoría
        const oldDataResult = await query('SELECT * FROM Usuarios_Sistema WHERE cedula_usuario = $1', [id]);
        if (oldDataResult.rows.length === 0) {
            return { success: false, error: 'Usuario no encontrado' };
        }
        const oldData = oldDataResult.rows[0];

        const updates: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        if (data.nombres) {
            updates.push(`nombres = $${paramCount++}`);
            values.push(data.nombres);
        }
        if (data.apellidos) {
            updates.push(`apellidos = $${paramCount++}`);
            values.push(data.apellidos);
        }
        if (data.correo) {
            updates.push(`correo_electronico = $${paramCount++}`);
            values.push(data.correo);
        }
        if (data.telefonoCelular !== undefined) {
            updates.push(`telefono_celular = $${paramCount++}`);
            values.push(data.telefonoCelular || null);
        }
        if (data.telefonoLocal !== undefined) {
            updates.push(`telefono_local = $${paramCount++}`);
            values.push(data.telefonoLocal || null);
        }
        if (data.role) {
            updates.push(`rol = $${paramCount++}`);
            values.push(data.role);
        }
        if (data.status !== undefined) {
            updates.push(`activo = $${paramCount++}`);
            values.push(data.status === 'Activo');
        }
        if (data.password) {
            const contrasena_hash = await hashPassword(data.password);
            updates.push(`contrasena_hash = $${paramCount++}`);
            values.push(contrasena_hash);
        }

        if (updates.length === 0) {
            return { success: false, error: 'No hay campos para actualizar' };
        }

        values.push(id);
        const result = await query(`
            UPDATE Usuarios_Sistema 
            SET ${updates.join(', ')}
            WHERE cedula_usuario = $${paramCount}
            RETURNING *
        `, values);

        // Registrar cambios en auditoría
        const fieldsToAudit = [
            { key: 'nombres', dbKey: 'nombres' },
            { key: 'apellidos', dbKey: 'apellidos' },
            { key: 'correo', dbKey: 'correo_electronico' },
            { key: 'telefonoCelular', dbKey: 'telefono_celular' },
            { key: 'telefonoLocal', dbKey: 'telefono_local' },
            { key: 'role', dbKey: 'rol' },
            { key: 'status', dbKey: 'activo', transform: (val: any) => val === 'Activo' ? true : false }
        ];

        for (const field of fieldsToAudit) {
            const dataKey = field.key as keyof typeof data;
            let newValue: any = data[dataKey];

            // Transformar si es necesario
            if (field.transform && newValue !== undefined) {
                newValue = field.transform(newValue);
            }

            if (newValue !== undefined && oldData[field.dbKey] !== newValue) {
                await query(
                    `INSERT INTO Auditoria_Usuarios 
                    (cedula_usuario_modificado, campo_modificado, valor_anterior, valor_nuevo, cedula_responsable, nombre_responsable) 
                    VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        id,
                        field.dbKey,
                        oldData[field.dbKey]?.toString() || null,
                        newValue?.toString() || null,
                        session?.cedula || 'SISTEMA',
                        session?.nombre || 'Sistema'
                    ]
                );
            }
        }

        revalidatePath('/administration');
        return { success: true, data: result.rows[0] };
    } catch (error: any) {
        console.error('Error al actualizar usuario:', error);
        return { success: false, error: error.message || 'Error al actualizar usuario' };
    }
}

export async function deleteUsuario(id: string) {
    try {
        // Verificar permisos - alumnos no pueden eliminar usuarios
        const permiso = await verificarPermisoAlumno('eliminar', 'usuario', { cedula: id });
        if (!permiso.allowed) {
            return { success: false, error: permiso.error || 'Los alumnos no pueden eliminar usuarios' };
        }

        const session = await getSession();
        if (!session) {
            return { success: false, error: 'No autorizado' };
        }

        // Obtener rol del usuario a eliminar
        const targetUserRes = await query('SELECT rol FROM Usuarios_Sistema WHERE cedula_usuario = $1', [id]);
        if (targetUserRes.rows.length === 0) {
            return { success: false, error: 'Usuario no encontrado' };
        }

        const targetRole = targetUserRes.rows[0].rol;
        const currentRole = session.rol;

        // Reglas de restricción
        if (currentRole === 'Profesor') {
            if (targetRole === 'Coordinador' || targetRole === 'Administrador' || targetRole === 'Admin') {
                return { success: false, error: 'No tienes permisos para eliminar a Coordinadores o Administradores.' };
            }
        }

        if (currentRole === 'Coordinador') {
            if (targetRole === 'Administrador' || targetRole === 'Admin') {
                return { success: false, error: 'No tienes permisos para eliminar a Administradores.' };
            }
        }

        // Obtener datos completos del usuario antes de eliminar
        const userDataRes = await query('SELECT * FROM Usuarios_Sistema WHERE cedula_usuario = $1', [id]);
        const userData = userDataRes.rows[0];

        // Registrar en auditoría antes de eliminar
        await query(
            `INSERT INTO Auditoria_Usuarios 
            (cedula_usuario_modificado, campo_modificado, valor_anterior, valor_nuevo, cedula_responsable, nombre_responsable) 
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                id,
                'ELIMINACION_USUARIO',
                `${userData.nombres} ${userData.apellidos} (${userData.rol})`,
                'ELIMINADO',
                session?.cedula || 'SISTEMA',
                session?.nombre || 'Sistema'
            ]
        );

        await query('DELETE FROM Usuarios_Sistema WHERE cedula_usuario = $1', [id]);
        revalidatePath('/administration');
        return { success: true };
    } catch (error: any) {
        console.error('Error al eliminar usuario:', error);
        return { success: false, error: error.message || 'Error al eliminar usuario' };
    }
}

export async function toggleUsuarioStatus(id: string) {
    try {
        const session = await getSession();
        if (!session) {
            return { success: false, error: 'No autorizado' };
        }

        // Obtener datos del usuario objetivo
        const targetUserRes = await query('SELECT rol, activo FROM Usuarios_Sistema WHERE cedula_usuario = $1', [id]);
        if (targetUserRes.rows.length === 0) {
            return { success: false, error: 'Usuario no encontrado' };
        }

        const targetUser = targetUserRes.rows[0];
        const targetRole = targetUser.rol;
        const currentRole = session.rol;
        const currentStatus = targetUser.activo;

        // Reglas de restricción (mismas que delete)
        if (currentRole === 'Profesor') {
            if (targetRole === 'Coordinador' || targetRole === 'Administrador' || targetRole === 'Admin') {
                return { success: false, error: 'No tienes permisos para modificar Coordinadores o Administradores.' };
            }
        }

        if (currentRole === 'Coordinador') {
            if (targetRole === 'Administrador' || targetRole === 'Admin') {
                return { success: false, error: 'No tienes permisos para modificar Administradores.' };
            }
        }

        // Toggle status
        await query('UPDATE Usuarios_Sistema SET activo = $1 WHERE cedula_usuario = $2', [!currentStatus, id]);

        revalidatePath('/administration');
        return { success: true, newStatus: !currentStatus ? 'Activo' : 'Inactivo' };
    } catch (error: any) {
        console.error('Error al cambiar estatus de usuario:', error);
        return { success: false, error: error.message || 'Error al cambiar estatus' };
    }
}

// Obtener participaciones (Alumnos/Profesores) de un usuario
export async function getParticipacionesUsuario(cedula: string) {
    try {
        const alumnos = await query(`
            SELECT term as semestre, nrc, tipo
            FROM Alumnos
            WHERE cedula_alumno = $1
            ORDER BY term DESC
        `, [cedula]);

        const profesores = await query(`
            SELECT term as semestre, nrc, tipo
            FROM Profesores
            WHERE cedula_profesor = $1
            ORDER BY term DESC
        `, [cedula]);

        return {
            success: true,
            data: [
                ...alumnos.rows.map((r: any) => ({ ...r, id: cedula })),
                ...profesores.rows.map((r: any) => ({ ...r, id: cedula }))
            ]
        };
    } catch (error) {
        console.error('Error al obtener participaciones:', error);
        return { success: false, error: 'Error al obtener participaciones', data: [] };
    }
}

// ============================================================================
// CATEGORÍAS
// ============================================================================

export interface Categoria {
    id: string; // num_categoria-id_materia
    nombre: string;
    materiaid: string; // id_materia
    num_categoria?: number;
    id_materia?: number;
}

export async function getCategorias() {
    try {
        const result = await query(`
            SELECT 
                num_categoria || '-' || id_materia as id,
                nombre_categoria as nombre,
                id_materia::text as "materiaid",
                num_categoria,
                id_materia
            FROM Categorias
            ORDER BY id_materia, num_categoria
        `);
        return { success: true, data: result.rows };
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        return { success: false, error: 'Error al obtener categorías' };
    }
}

export async function createCategoria(data: Partial<Categoria>) {
    try {
        if (!data.materiaid || String(data.materiaid).trim() === '') {
            return { success: false, error: 'Se requiere id_materia' };
        }

        const idMateriaStr = String(data.materiaid).trim();
        const idMateria = parseInt(idMateriaStr);

        if (isNaN(idMateria) || idMateria <= 0) {
            console.error('ID materia inválido:', data.materiaid, 'Tipo:', typeof data.materiaid);
            return { success: false, error: `El id_materia no es válido: "${data.materiaid}"` };
        }

        const result = await query(`
            INSERT INTO Categorias (id_materia, nombre_categoria)
            VALUES ($1, $2)
            RETURNING num_categoria, id_materia, nombre_categoria
        `, [idMateria, data.nombre]);

        revalidatePath('/administration');
        return {
            success: true,
            data: {
                id: `${result.rows[0].num_categoria}-${result.rows[0].id_materia}`,
                nombre: result.rows[0].nombre_categoria,
                legalfieldid: result.rows[0].id_materia.toString()
            }
        };
    } catch (error: any) {
        console.error('Error al crear categoría:', error);
        return { success: false, error: error.message || 'Error al crear categoría' };
    }
}

export async function updateCategoria(id: string, data: Partial<Categoria>) {
    try {
        const parts = id.split('-');
        if (parts.length !== 2) {
            return { success: false, error: 'El ID no tiene el formato correcto' };
        }

        const num_categoria = parseInt(parts[0]);
        const id_materia = parseInt(parts[1]);

        if (isNaN(num_categoria) || isNaN(id_materia)) {
            return { success: false, error: 'Los valores del ID no son válidos' };
        }

        const result = await query(`
            UPDATE Categorias
            SET nombre_categoria = $1
            WHERE num_categoria = $2 AND id_materia = $3
            RETURNING *
        `, [data.nombre, num_categoria, id_materia]);

        revalidatePath('/administration');
        return { success: true, data: result.rows[0] };
    } catch (error: any) {
        console.error('Error al actualizar categoría:', error);
        return { success: false, error: error.message || 'Error al actualizar categoría' };
    }
}

export async function deleteCategoria(id: string) {
    try {
        const parts = id.split('-');
        if (parts.length !== 2) {
            return { success: false, error: 'El ID no tiene el formato correcto' };
        }

        const num_categoria = parseInt(parts[0]);
        const id_materia = parseInt(parts[1]);

        if (isNaN(num_categoria) || isNaN(id_materia)) {
            return { success: false, error: 'Los valores del ID no son válidos' };
        }

        await query(`
            DELETE FROM Categorias
            WHERE num_categoria = $1 AND id_materia = $2
        `, [num_categoria, id_materia]);
        revalidatePath('/administration');
        return { success: true };
    } catch (error: any) {
        console.error('Error al eliminar categoría:', error);
        return { success: false, error: error.message || 'Error al eliminar categoría' };
    }
}

// ============================================================================
// SUBCATEGORÍAS
// ============================================================================

export interface SubCategoria {
    id: string; // num_subcategoria-num_categoria-id_materia
    nombre: string;
    categorylegalfieldid: string; // num_categoria-id_materia
    num_subcategoria?: number;
    num_categoria?: number;
    id_materia?: number;
}

export async function getSubCategorias() {
    try {
        const result = await query(`
            SELECT 
                num_subcategoria || '-' || num_categoria || '-' || id_materia as id,
                nombre_subcategoria as nombre,
                num_categoria || '-' || id_materia as "categorymateriaid",
                num_subcategoria,
                num_categoria,
                id_materia
            FROM Sub_Categorias
            ORDER BY id_materia, num_categoria, num_subcategoria
        `);
        return { success: true, data: result.rows };
    } catch (error) {
        console.error('Error al obtener subcategorías:', error);
        return { success: false, error: 'Error al obtener subcategorías' };
    }
}

export async function createSubCategoria(data: Partial<SubCategoria>) {
    try {
        if (!data.categorylegalfieldid) {
            return { success: false, error: 'Se requiere categorylegalfieldid' };
        }

        const parts = data.categorylegalfieldid.split('-');
        if (parts.length !== 2) {
            return { success: false, error: 'El categorylegalfieldid no tiene el formato correcto' };
        }

        const num_categoria = parseInt(parts[0]);
        const id_materia = parseInt(parts[1]);

        if (isNaN(num_categoria) || isNaN(id_materia)) {
            return { success: false, error: 'Los valores de categoría o materia no son válidos' };
        }

        // Calcular el siguiente num_subcategoria disponible para esta combinación
        const maxResult = await query(`
            SELECT COALESCE(MAX(num_subcategoria), 0) as max_num
            FROM Sub_Categorias
            WHERE num_categoria = $1 AND id_materia = $2
        `, [num_categoria, id_materia]);

        const nextNumSubcategoria = (maxResult.rows[0]?.max_num || 0) + 1;

        const result = await query(`
            INSERT INTO Sub_Categorias (num_subcategoria, num_categoria, id_materia, nombre_subcategoria)
            VALUES ($1, $2, $3, $4)
            RETURNING num_subcategoria, num_categoria, id_materia, nombre_subcategoria
        `, [nextNumSubcategoria, num_categoria, id_materia, data.nombre]);

        revalidatePath('/administration');
        return {
            success: true,
            data: {
                id: `${result.rows[0].num_subcategoria}-${result.rows[0].num_categoria}-${result.rows[0].id_materia}`,
                nombre: result.rows[0].nombre_subcategoria,
                categorylegalfieldid: data.categorylegalfieldid
            }
        };
    } catch (error: any) {
        console.error('Error al crear subcategoría:', error);
        if (error.code === '23505') { // unique_violation
            return { success: false, error: 'Ya existe una subcategoría con ese identificador' };
        }
        return { success: false, error: error.message || 'Error al crear subcategoría' };
    }
}

export async function updateSubCategoria(id: string, data: Partial<SubCategoria>) {
    try {
        const parts = id.split('-');
        if (parts.length !== 3) {
            return { success: false, error: 'El ID no tiene el formato correcto' };
        }

        const num_subcategoria = parseInt(parts[0]);
        const num_categoria = parseInt(parts[1]);
        const id_materia = parseInt(parts[2]);

        if (isNaN(num_subcategoria) || isNaN(num_categoria) || isNaN(id_materia)) {
            return { success: false, error: 'Los valores del ID no son válidos' };
        }

        const result = await query(`
            UPDATE Sub_Categorias
            SET nombre_subcategoria = $1
            WHERE num_subcategoria = $2 AND num_categoria = $3 AND id_materia = $4
            RETURNING *
        `, [data.nombre, num_subcategoria, num_categoria, id_materia]);

        revalidatePath('/administration');
        return { success: true, data: result.rows[0] };
    } catch (error: any) {
        console.error('Error al actualizar subcategoría:', error);
        return { success: false, error: error.message || 'Error al actualizar subcategoría' };
    }
}

export async function deleteSubCategoria(id: string) {
    try {
        const parts = id.split('-');
        if (parts.length !== 3) {
            return { success: false, error: 'El ID no tiene el formato correcto' };
        }

        const num_subcategoria = parseInt(parts[0]);
        const num_categoria = parseInt(parts[1]);
        const id_materia = parseInt(parts[2]);

        if (isNaN(num_subcategoria) || isNaN(num_categoria) || isNaN(id_materia)) {
            return { success: false, error: 'Los valores del ID no son válidos' };
        }

        await query(`
            DELETE FROM Sub_Categorias
            WHERE num_subcategoria = $1 AND num_categoria = $2 AND id_materia = $3
        `, [num_subcategoria, num_categoria, id_materia]);
        revalidatePath('/administration');
        return { success: true };
    } catch (error: any) {
        console.error('Error al eliminar subcategoría:', error);
        return { success: false, error: error.message || 'Error al eliminar subcategoría' };
    }
}

// ============================================================================
// NÚCLEOS
// ============================================================================

export interface Nucleo {
    id: string;
    nombre: string;
    id_parroquia?: number;
}

export async function getNucleos() {
    try {
        const result = await query(`
            SELECT 
                n.id_nucleo::text as id,
                n.nombre,
                n.id_parroquia,
                p.nombre_parroquia,
                m.id_municipio,
                m.nombre_municipio,
                e.id_estado,
                e.nombre_estado
            FROM Nucleos n
            LEFT JOIN Parroquias p ON n.id_parroquia = p.id_parroquia
            LEFT JOIN Municipios m ON p.id_municipio = m.id_municipio
            LEFT JOIN Estados e ON m.id_estado = e.id_estado
            ORDER BY e.nombre_estado, m.nombre_municipio, n.nombre
        `);
        return { success: true, data: result.rows };
    } catch (error) {
        console.error('Error al obtener núcleos:', error);
        return { success: false, error: 'Error al obtener núcleos' };
    }
}

export async function createNucleo(data: Partial<Nucleo>) {
    try {
        let id_parroquia: number | null = null;
        if (data.id_parroquia) {
            const parsed = parseInt(String(data.id_parroquia));
            id_parroquia = isNaN(parsed) ? null : parsed;
        }
        const result = await query(`
            INSERT INTO Nucleos (nombre, id_parroquia)
            VALUES ($1, $2)
            RETURNING id_nucleo, nombre
        `, [data.nombre, id_parroquia]);

        revalidatePath('/administration');
        return {
            success: true,
            data: {
                id: result.rows[0].id_nucleo.toString(),
                nombre: result.rows[0].nombre
            }
        };
    } catch (error: any) {
        console.error('Error al crear núcleo:', error);
        return { success: false, error: error.message || 'Error al crear núcleo' };
    }
}

export async function updateNucleo(id: string, data: Partial<Nucleo>) {
    try {
        let id_parroquia: number | null = null;
        if (data.id_parroquia) {
            const parsed = parseInt(String(data.id_parroquia));
            id_parroquia = isNaN(parsed) ? null : parsed;
        }

        const idNucleo = parseInt(id);
        if (isNaN(idNucleo)) {
            return { success: false, error: 'El ID del núcleo no es válido' };
        }

        const result = await query(`
            UPDATE Nucleos
            SET nombre = $1, id_parroquia = $2
            WHERE id_nucleo = $3
            RETURNING *
        `, [data.nombre, id_parroquia, idNucleo]);

        revalidatePath('/administration');
        return { success: true, data: result.rows[0] };
    } catch (error: any) {
        console.error('Error al actualizar núcleo:', error);
        return { success: false, error: error.message || 'Error al actualizar núcleo' };
    }
}

export async function deleteNucleo(id: string) {
    try {
        const idNucleo = parseInt(id);
        if (isNaN(idNucleo)) {
            return { success: false, error: 'El ID del núcleo no es válido' };
        }
        await query('DELETE FROM Nucleos WHERE id_nucleo = $1', [idNucleo]);
        revalidatePath('/administration');
        return { success: true };
    } catch (error: any) {
        console.error('Error al eliminar núcleo:', error);
        return { success: false, error: error.message || 'Error al eliminar núcleo' };
    }
}

// ============================================================================
// HELPERS: Obtener catálogos para formularios
// ============================================================================

export async function getMaterias() {
    try {
        const result = await query(`
            SELECT id_materia::text as id, nombre_materia as nombre
            FROM Materias
            ORDER BY nombre_materia
        `);
        return { success: true, data: result.rows };
    } catch (error) {
        console.error('Error al obtener materias:', error);
        return { success: false, error: 'Error al obtener materias' };
    }
}

export async function createMateria(data: Partial<{ nombre: string }>) {
    try {
        if (!data.nombre || data.nombre.trim() === '') {
            return { success: false, error: 'El nombre de la materia es requerido' };
        }

        const result = await query(`
            INSERT INTO Materias (nombre_materia)
            VALUES ($1)
            RETURNING id_materia, nombre_materia
        `, [data.nombre]);

        revalidatePath('/administration');
        return {
            success: true,
            data: {
                id: result.rows[0].id_materia.toString(),
                nombre: result.rows[0].nombre_materia
            }
        };
    } catch (error: any) {
        console.error('Error al crear materia:', error);
        return { success: false, error: error.message || 'Error al crear materia' };
    }
}

export async function updateMateria(id: string, data: Partial<{ nombre: string }>) {
    try {
        const idMateria = parseInt(id);
        if (isNaN(idMateria)) {
            return { success: false, error: 'ID de materia inválido' };
        }

        const result = await query(`
            UPDATE Materias
            SET nombre_materia = $1
            WHERE id_materia = $2
            RETURNING id_materia, nombre_materia
        `, [data.nombre, idMateria]);

        revalidatePath('/administration');
        return {
            success: true,
            data: {
                id: result.rows[0].id_materia.toString(),
                nombre: result.rows[0].nombre_materia
            }
        };
    } catch (error: any) {
        console.error('Error al actualizar materia:', error);
        return { success: false, error: error.message || 'Error al actualizar materia' };
    }
}

export async function deleteMateria(id: string) {
    try {
        const idMateria = parseInt(id);
        if (isNaN(idMateria)) {
            return { success: false, error: 'ID de materia inválido' };
        }

        // Verificar dependencias (Categorías)
        const checkCategorias = await query('SELECT COUNT(*) as count FROM Categorias WHERE id_materia = $1', [idMateria]);
        if (parseInt(checkCategorias.rows[0].count) > 0) {
            return {
                success: false,
                error: `No se puede eliminar la materia porque tiene ${checkCategorias.rows[0].count} categoría(s) asociada(s). Elimine primero las categorías.`
            };
        }

        const result = await query('DELETE FROM Materias WHERE id_materia = $1 RETURNING id_materia', [idMateria]);

        if (result.rows.length === 0) {
            return { success: false, error: 'Materia no encontrada' };
        }

        revalidatePath('/administration');
        return { success: true };
    } catch (error: any) {
        console.error('Error al eliminar materia:', error);
        return { success: false, error: error.message || 'Error al eliminar materia' };
    }
}

// ============================================================================
// SEMESTRES
// ============================================================================

export interface Semestre {
    term: string;
    fecha_inicio: string;
    fecha_final: string;
}

export async function getSemestres() {
    try {
        const result = await query(`
            SELECT 
                term as id,
                term,
                fecha_inicio,
                fecha_final,
                CASE 
                    WHEN CURRENT_DATE BETWEEN fecha_inicio AND fecha_final THEN 'Activo'
                    WHEN CURRENT_DATE < fecha_inicio THEN 'Pendiente'
                    ELSE 'Finalizado'
                END as estado
            FROM Semestres
            ORDER BY fecha_inicio DESC
        `);
        return { success: true, data: result.rows };
    } catch (error) {
        console.error('Error al obtener semestres:', error);
        return { success: false, error: 'Error al obtener semestres' };
    }
}

export async function createSemestre(data: Partial<Semestre>) {
    try {
        if (!data.term || !data.fecha_inicio || !data.fecha_final) {
            return { success: false, error: 'Todos los campos son obligatorios' };
        }

        // Validar formato del term (ej: 2025-15)
        const termPattern = /^\d{4}-\d{2}$/;
        if (!termPattern.test(data.term)) {
            return { success: false, error: 'El formato del semestre debe ser YYYY-NN (ej: 2025-15)' };
        }

        // Validar que fecha_final > fecha_inicio
        const fechaInicio = new Date(data.fecha_inicio);
        const fechaFinal = new Date(data.fecha_final);
        if (fechaFinal <= fechaInicio) {
            return { success: false, error: 'La fecha final debe ser posterior a la fecha de inicio' };
        }

        // VALIDACIÓN: Solapamiento de fechas
        const overlapCheck = await query(`
            SELECT term FROM Semestres 
            WHERE 
                ($1 <= fecha_final AND $2 >= fecha_inicio)
        `, [data.fecha_inicio, data.fecha_final]);

        if (overlapCheck.rows.length > 0) {
            const overlappingTerm = overlapCheck.rows[0].term;
            return {
                success: false,
                error: `El rango de fechas choca con el semestre existente: ${overlappingTerm}`
            };
        }

        const result = await query(`
            INSERT INTO Semestres (term, fecha_inicio, fecha_final)
            VALUES ($1, $2, $3)
            RETURNING term, fecha_inicio, fecha_final
        `, [data.term, data.fecha_inicio, data.fecha_final]);

        revalidatePath('/administration');
        return {
            success: true,
            data: {
                id: result.rows[0].term,
                term: result.rows[0].term,
                fecha_inicio: result.rows[0].fecha_inicio,
                fecha_final: result.rows[0].fecha_final
            }
        };
    } catch (error: any) {
        console.error('Error al crear semestre:', error);
        if (error.code === '23505') { // unique_violation
            return { success: false, error: 'Ya existe un semestre con ese término' };
        }
        if (error.code === '23514') { // check_violation
            return { success: false, error: 'La fecha final debe ser posterior a la fecha de inicio' };
        }
        return { success: false, error: error.message || 'Error al crear semestre' };
    }
}

export async function updateSemestre(term: string, data: Partial<Semestre>) {
    try {
        if (!term) {
            return { success: false, error: 'El término del semestre es obligatorio' };
        }


        // Obtener datos actuales para completar fechas faltantes y validar
        const currentDataRes = await query('SELECT * FROM Semestres WHERE term = $1', [term]);
        if (currentDataRes.rows.length === 0) {
            return { success: false, error: 'Semestre no encontrado' };
        }
        const currentData = currentDataRes.rows[0];

        // Fechas efectivas (nuevas o existentes)
        const newFechaInicio = data.fecha_inicio ? new Date(data.fecha_inicio) : new Date(currentData.fecha_inicio);
        const newFechaFinal = data.fecha_final ? new Date(data.fecha_final) : new Date(currentData.fecha_final);

        // Validar coherencia de fechas efectivas
        if (newFechaFinal <= newFechaInicio) {
            return { success: false, error: 'La fecha final debe ser posterior a la fecha de inicio' };
        }

        // VALIDACIÓN: Solapamiento de fechas (excluyendo el semestre actual)
        const overlapCheck = await query(`
            SELECT term FROM Semestres 
            WHERE 
                term != $3 AND
                ($1 <= fecha_final AND $2 >= fecha_inicio)
        `, [
            newFechaInicio.toISOString().split('T')[0],
            newFechaFinal.toISOString().split('T')[0],
            term
        ]);

        if (overlapCheck.rows.length > 0) {
            const overlappingTerm = overlapCheck.rows[0].term;
            return {
                success: false,
                error: `El rango de fechas choca con el semestre existente: ${overlappingTerm}`
            };
        }

        const result = await query(`
            UPDATE Semestres
            SET fecha_inicio = COALESCE($1, fecha_inicio),
                fecha_final = COALESCE($2, fecha_final)
            WHERE term = $3
            RETURNING term, fecha_inicio, fecha_final
        `, [data.fecha_inicio || null, data.fecha_final || null, term]);

        if (result.rows.length === 0) {
            return { success: false, error: 'Semestre no encontrado' };
        }

        revalidatePath('/administration');
        return {
            success: true,
            data: {
                id: result.rows[0].term,
                term: result.rows[0].term,
                fecha_inicio: result.rows[0].fecha_inicio,
                fecha_final: result.rows[0].fecha_final
            }
        };
    } catch (error: any) {
        console.error('Error al actualizar semestre:', error);
        if (error.code === '23514') { // check_violation
            return { success: false, error: 'La fecha final debe ser posterior a la fecha de inicio' };
        }
        return { success: false, error: error.message || 'Error al actualizar semestre' };
    }
}

export async function deleteSemestre(term: string) {
    try {
        if (!term) {
            return { success: false, error: 'El término del semestre es obligatorio' };
        }

        // Verificar si hay alumnos, profesores o casos asociados al semestre
        const checkAlumnos = await query('SELECT COUNT(*) as count FROM Alumnos WHERE term = $1', [term]);
        const checkProfesores = await query('SELECT COUNT(*) as count FROM Profesores WHERE term = $1', [term]);
        const checkAsignaciones = await query('SELECT COUNT(*) as count FROM Se_Asignan WHERE term = $1', [term]);
        const checkSupervisiones = await query('SELECT COUNT(*) as count FROM Supervisan WHERE term = $1', [term]);

        const totalAsociaciones =
            parseInt(checkAlumnos.rows[0].count) +
            parseInt(checkProfesores.rows[0].count) +
            parseInt(checkAsignaciones.rows[0].count) +
            parseInt(checkSupervisiones.rows[0].count);

        if (totalAsociaciones > 0) {
            return {
                success: false,
                error: `No se puede eliminar el semestre porque tiene ${totalAsociaciones} registro(s) asociado(s) (alumnos, profesores, asignaciones o supervisiones)`
            };
        }

        const result = await query('DELETE FROM Semestres WHERE term = $1 RETURNING term', [term]);

        if (result.rows.length === 0) {
            return { success: false, error: 'Semestre no encontrado' };
        }

        revalidatePath('/administration');
        return { success: true };
    } catch (error: any) {
        console.error('Error al eliminar semestre:', error);
        if (error.code === '23503') { // foreign_key_violation
            return { success: false, error: 'No se puede eliminar el semestre porque tiene registros asociados' };
        }
        return { success: false, error: error.message || 'Error al eliminar semestre' };
    }
}

// ============================================================================
// AMBITO LEGAL
// ============================================================================

export interface LegalField {
    id: string;
    nombre: string;
    longid: string; // num_subcategoria-num_categoria-id_materia
    num_legalfield?: number
    num_subcategoria?: number;
    num_categoria?: number;
    id_materia?: number;
}

export async function getLegalField() {
    try {
        const result = await query(`
            SELECT 
                num_ambito_legal || '-' || num_subcategoria || '-' || num_categoria || '-' || id_materia as id,
                nombre_ambito_legal as nombre,
                num_subcategoria || '-' || num_categoria || '-' || id_materia  as "longid",
                num_subcategoria || '-' || num_categoria || '-' || id_materia  as "categorylegalfieldid",
                num_subcategoria,
                num_categoria,
                id_materia
            FROM Ambitos_Legales
            ORDER BY num_ambito_legal,id_materia, num_categoria, num_subcategoria
        `);
        return { success: true, data: result.rows };
    } catch (error) {
        console.error('Error al obtener subcategorías:', error);
        return { success: false, error: 'Error al obtener subcategorías' };
    }
}

export async function createLegalField(data: Partial<LegalField>) {
    try {
        if (!data.longid) {
            return { success: false, error: 'Se requiere longid (formato: num_subcategoria-num_categoria-id_materia)' };
        }

        const parts = data.longid.split('-');
        if (parts.length !== 3) {
            return { success: false, error: 'El longid debe tener el formato: num_subcategoria-num_categoria-id_materia' };
        }

        const num_subcategoria = parseInt(parts[0]);
        const num_categoria = parseInt(parts[1]);
        const id_materia = parseInt(parts[2]);

        if (isNaN(num_subcategoria) || isNaN(num_categoria) || isNaN(id_materia)) {
            return { success: false, error: 'Los valores de subcategoría, categoría o materia no son válidos' };
        }

        // Calcular el siguiente num_ambito_legal disponible para esta combinación
        const maxResult = await query(`
            SELECT COALESCE(MAX(num_ambito_legal), 0) as max_num
            FROM Ambitos_Legales
            WHERE num_subcategoria = $1 AND num_categoria = $2 AND id_materia = $3
        `, [num_subcategoria, num_categoria, id_materia]);

        const nextNumAmbitoLegal = (maxResult.rows[0]?.max_num || 0) + 1;

        const result = await query(`
            INSERT INTO Ambitos_Legales (num_ambito_legal, num_subcategoria, num_categoria, id_materia, nombre_ambito_legal)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING num_ambito_legal, num_subcategoria, num_categoria, id_materia, nombre_ambito_legal
        `, [nextNumAmbitoLegal, num_subcategoria, num_categoria, id_materia, data.nombre]);

        revalidatePath('/administration');
        return {
            success: true,
            data: {
                id: `${result.rows[0].num_ambito_legal}-${result.rows[0].num_subcategoria}-${result.rows[0].num_categoria}-${result.rows[0].id_materia}`,
                nombre: result.rows[0].nombre_ambito_legal,
                longid: data.longid
            }
        };
    } catch (error: any) {
        console.error('Error al crear ámbito legal:', error);
        if (error.code === '23505') { // unique_violation
            return { success: false, error: 'Ya existe un ámbito legal con ese identificador' };
        }
        return { success: false, error: error.message || 'Error al crear ámbito legal' };
    }
}

export async function updateLegalField(id: string, data: Partial<LegalField>) {
    try {
        const parts = id.split('-');
        if (parts.length !== 4) {
            return { success: false, error: 'El ID debe tener el formato: num_ambito_legal-num_subcategoria-num_categoria-id_materia' };
        }

        const num_ambito_legal = parseInt(parts[0]);
        const num_subcategoria = parseInt(parts[1]);
        const num_categoria = parseInt(parts[2]);
        const id_materia = parseInt(parts[3]);

        if (isNaN(num_ambito_legal) || isNaN(num_subcategoria) || isNaN(num_categoria) || isNaN(id_materia)) {
            return { success: false, error: 'Los valores del ID no son válidos' };
        }

        const result = await query(`
            UPDATE Ambitos_Legales
            SET nombre_ambito_legal = $1
            WHERE num_ambito_legal = $2 AND num_subcategoria = $3 AND num_categoria = $4 AND id_materia = $5
            RETURNING *
        `, [data.nombre, num_ambito_legal, num_subcategoria, num_categoria, id_materia]);

        revalidatePath('/administration');
        return { success: true, data: result.rows[0] };
    } catch (error: any) {
        console.error('Error al actualizar ámbito legal:', error);
        return { success: false, error: error.message || 'Error al actualizar ámbito legal' };
    }
}

export async function deleteLegalField(id: string) {
    try {
        const parts = id.split('-');
        if (parts.length !== 4) {
            return { success: false, error: 'El ID debe tener el formato: num_ambito_legal-num_subcategoria-num_categoria-id_materia' };
        }

        const num_ambito_legal = parseInt(parts[0]);
        const num_subcategoria = parseInt(parts[1]);
        const num_categoria = parseInt(parts[2]);
        const id_materia = parseInt(parts[3]);

        if (isNaN(num_ambito_legal) || isNaN(num_subcategoria) || isNaN(num_categoria) || isNaN(id_materia)) {
            return { success: false, error: 'Los valores del ID no son válidos' };
        }

        await query(`
            DELETE FROM Ambitos_Legales
            WHERE num_ambito_legal = $1 AND num_subcategoria = $2 AND num_categoria = $3 AND id_materia = $4
        `, [num_ambito_legal, num_subcategoria, num_categoria, id_materia]);
        revalidatePath('/administration');
        return { success: true };
    } catch (error: any) {
        console.error('Error al eliminar ámbito legal:', error);
        return { success: false, error: error.message || 'Error al eliminar ámbito legal' };
    }
}

// ============================================================================
// BIENES
// ============================================================================

export interface Bien {
    id: string; // id_bien
    descripcion: string;
}

export async function getBienes() {
    try {
        const result = await query(`
            SELECT id_bien::text as id, descripcion
            FROM Bienes
            ORDER BY descripcion
        `);
        return { success: true, data: result.rows };
    } catch (error) {
        console.error('Error al obtener bienes:', error);
        return { success: false, error: 'Error al obtener bienes' };
    }
}

export async function createBien(data: Partial<Bien>) {
    try {
        if (!data.descripcion || data.descripcion.trim() === '') {
            return { success: false, error: 'La descripción del bien es requerida' };
        }

        const result = await query(`
            INSERT INTO Bienes (descripcion)
            VALUES ($1)
            RETURNING id_bien, descripcion
        `, [data.descripcion]);

        revalidatePath('/administration');
        return {
            success: true,
            data: {
                id: result.rows[0].id_bien.toString(),
                descripcion: result.rows[0].descripcion
            }
        };
    } catch (error: any) {
        console.error('Error al crear bien:', error);
        return { success: false, error: error.message || 'Error al crear bien' };
    }
}

export async function updateBien(id: string, data: Partial<Bien>) {
    try {
        const idBien = parseInt(id);
        if (isNaN(idBien)) {
            return { success: false, error: 'ID de bien inválido' };
        }

        const result = await query(`
            UPDATE Bienes
            SET descripcion = $1
            WHERE id_bien = $2
            RETURNING id_bien, descripcion
        `, [data.descripcion, idBien]);

        if (result.rows.length === 0) {
            return { success: false, error: 'Bien no encontrado' };
        }

        revalidatePath('/administration');
        return {
            success: true,
            data: {
                id: result.rows[0].id_bien.toString(),
                descripcion: result.rows[0].descripcion
            }
        };
    } catch (error: any) {
        console.error('Error al actualizar bien:', error);
        return { success: false, error: error.message || 'Error al actualizar bien' };
    }
}

export async function deleteBien(id: string) {
    try {
        const idBien = parseInt(id);
        if (isNaN(idBien)) {
            return { success: false, error: 'ID de bien inválido' };
        }

        // Verificar si el bien está siendo usado en la tabla Almacenan (solicitantes)
        const checkUsage = await query('SELECT COUNT(*) as count FROM Almacenan WHERE id_bien = $1', [idBien]);
        if (parseInt(checkUsage.rows[0].count) > 0) {
            return { 
                success: false, 
                error: `No se puede eliminar el bien porque está asociado a ${checkUsage.rows[0].count} solicitante(s).` 
            };
        }

        await query('DELETE FROM Bienes WHERE id_bien = $1', [idBien]);
        revalidatePath('/administration');
        return { success: true };
    } catch (error: any) {
        console.error('Error al eliminar bien:', error);
        return { success: false, error: error.message || 'Error al eliminar bien' };
    }
}


// ============================================================================
// CARGA MASIVA
// ============================================================================

export interface BulkUploadUser {
    cedula: string;
    nombres: string;
    apellidos: string;
    correo: string;
    telefonoLocal?: string;
    telefonoCelular?: string;
    nrc?: string;
    tipo?: string;
}

export interface BulkUploadResult {
    success: boolean;
    created: number;
    updated: number;
    errors: Array<{ row: number; cedula: string; error: string }>;
    message?: string;
}

export async function processBulkUpload(
    users: BulkUploadUser[],
    tipo: 'Estudiante' | 'Profesor',
    term: string
): Promise<BulkUploadResult> {
    const errors: Array<{ row: number; cedula: string; error: string }> = [];
    let created = 0;
    let updated = 0;

    try {
        await query('BEGIN');

        // Verificar que el semestre existe
        const termCheck = await query('SELECT term FROM Semestres WHERE term = $1', [term]);
        if (termCheck.rows.length === 0) {
            await query('ROLLBACK');
            return {
                success: false,
                created: 0,
                updated: 0,
                errors: [{ row: 0, cedula: '', error: `El semestre ${term} no existe` }],
                message: 'El semestre especificado no existe en la base de datos'
            };
        }

        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            const row = i + 2; // +2 porque la fila 1 es el encabezado y empezamos desde 0

            try {
                // Normalizar cédula (formato: V-12345678 o E-12345678)
                let cedula = user.cedula.trim();
                if (!cedula.includes('-')) {
                    // Si no tiene guion, asumir que empieza con V o E
                    if (cedula.startsWith('V') || cedula.startsWith('E')) {
                        cedula = cedula.substring(0, 1) + '-' + cedula.substring(1);
                    } else {
                        cedula = 'V-' + cedula;
                    }
                }

                // Validaciones básicas
                if (!user.nombres || !user.apellidos || !user.correo) {
                    errors.push({
                        row,
                        cedula,
                        error: 'Faltan campos obligatorios (nombres, apellidos o correo)'
                    });
                    continue;
                }

                // Verificar si el usuario ya existe
                const existingUser = await query(
                    'SELECT cedula_usuario, rol FROM Usuarios_Sistema WHERE cedula_usuario = $1',
                    [cedula]
                );

                const crypto = await import('crypto');
                //ejemplo ucabVXXXXXXXX
                const tempPassword = 'ucab' + cedula.replace('-', '');
                const contrasena_hash = await hashPassword(tempPassword);

                if (existingUser.rows.length > 0) {
                    // VALIDACIÓN: Conflicto de roles
                    const existingRol = existingUser.rows[0].rol;
                    if (tipo !== existingRol) {
                        errors.push({
                            row,
                            cedula,
                            error: `El usuario ya existe con el rol de ${existingRol}. No se puede cambiar el rol mediante este proceso.`
                        });
                        continue;
                    }

                    // Usuario existe, solo crear/actualizar el perfil
                    const existingCedula = existingUser.rows[0].cedula_usuario;

                    // Verificar si ya tiene perfil en este semestre
                    if (tipo === 'Estudiante') {
                        const existingProfile = await query(
                            'SELECT * FROM Alumnos WHERE cedula_alumno = $1 AND term = $2',
                            [existingCedula, term]
                        );

                        if (existingProfile.rows.length === 0) {
                            await query(
                                'INSERT INTO Alumnos (cedula_alumno, term, nrc, tipo) VALUES ($1, $2, $3, $4)',
                                [
                                    existingCedula,
                                    term,
                                    user.nrc || null,
                                    user.tipo || 'Inscrito'
                                ]
                            );
                            updated++;
                        } else {
                            // VALIDACIÓN: Ya inscrito en este semestre
                            errors.push({
                                row,
                                cedula,
                                error: `El usuario ya se encuentra registrado en el semestre ${term}.`
                            });
                            continue;
                        }
                    } else if (tipo === 'Profesor') {
                        const existingProfile = await query(
                            'SELECT * FROM Profesores WHERE cedula_profesor = $1 AND term = $2',
                            [existingCedula, term]
                        );

                        if (existingProfile.rows.length === 0) {
                            await query(
                                'INSERT INTO Profesores (cedula_profesor, term, nrc, tipo) VALUES ($1, $2, $3, $4)',
                                [
                                    existingCedula,
                                    term,
                                    user.nrc || null,
                                    user.tipo || 'Titular'
                                ]
                            );
                            updated++;
                        } else {
                            // VALIDACIÓN: Ya inscrito en este semestre
                            errors.push({
                                row,
                                cedula,
                                error: `El usuario ya se encuentra registrado en el semestre ${term}.`
                            });
                            continue;
                        }
                    }
                } else {
                    // Usuario no existe, crear usuario y perfil
                    // Insertar usuario base
                    await query(
                        `INSERT INTO Usuarios_Sistema 
                        (cedula_usuario, correo_electronico, contrasena_hash, nombres, apellidos, 
                         telefono_local, telefono_celular, rol, activo)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
                        [
                            cedula,
                            user.correo,
                            contrasena_hash,
                            user.nombres,
                            user.apellidos,
                            user.telefonoLocal || null,
                            user.telefonoCelular || null,
                            tipo
                        ]
                    );

                    // Crear perfil según tipo
                    if (tipo === 'Estudiante') {
                        await query(
                            'INSERT INTO Alumnos (cedula_alumno, term, nrc, tipo) VALUES ($1, $2, $3, $4)',
                            [
                                cedula,
                                term,
                                user.nrc || null,
                                user.tipo || 'Inscrito'
                            ]
                        );
                    } else if (tipo === 'Profesor') {
                        await query(
                            'INSERT INTO Profesores (cedula_profesor, term, nrc, tipo) VALUES ($1, $2, $3, $4)',
                            [
                                cedula,
                                term,
                                user.nrc || null,
                                user.tipo || 'Titular'
                            ]
                        );
                    }

                    created++;
                }
            } catch (error: any) {
                console.error(`Error procesando fila ${row}:`, error);
                errors.push({
                    row,
                    cedula: user.cedula || 'N/A',
                    error: error.message || 'Error desconocido'
                });
            }
        }

        await query('COMMIT');
        revalidatePath('/administration');

        return {
            success: errors.length === 0,
            created,
            updated,
            errors,
            message: errors.length === 0
                ? `Proceso completado: ${created} usuarios creados, ${updated} perfiles creados/actualizados`
                : `Proceso completado con errores: ${created} usuarios creados, ${updated} perfiles creados/actualizados, ${errors.length} errores`
        };
    } catch (error: any) {
        await query('ROLLBACK');
        console.error('Error en carga masiva:', error);
        return {
            success: false,
            created,
            updated,
            errors: [...errors, { row: 0, cedula: '', error: error.message || 'Error general en la transacción' }],
            message: 'Error al procesar la carga masiva'
        };
    }
}

