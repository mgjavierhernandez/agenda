import 'reflect-metadata';
import * as path from 'path';
import * as fs from 'fs';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { TeacherAssignmentsController } from './teacher-assignments.controller';

type RouteInfo = { method: string; path: string; handler: string };

function getRoutes(): RouteInfo[] {
  const proto = TeacherAssignmentsController.prototype as unknown as Record<string, (...args: never[]) => unknown>;
  const names = Object.getOwnPropertyNames(proto).filter((n) => n !== 'constructor');
  return names.map((name) => {
    const path: string | string[] | undefined = Reflect.getMetadata(PATH_METADATA, proto[name]);
    const method: RequestMethod | undefined = Reflect.getMetadata(METHOD_METADATA, proto[name]);
    const methodName = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'][method ?? -1] ?? `m${method}`;
    const p = Array.isArray(path) ? path.join(',') : String(path ?? '');
    return { method: methodName, path: p, handler: name };
  });
}

describe('TeacherAssignmentsController routing (regression: uuid is expected)', () => {
  it('expone GET teacher-assignments/course-directors (lista) sin ser sombreado por GET :id', () => {
    const routes = getRoutes();
    const list = routes.find((r) => r.method === 'GET' && r.path === 'course-directors');
    expect(list).toBeDefined();
    expect(list!.handler).toBe('findAllCourseDirectors');
  });

  it('declara las rutas especificas course-directors* ANTES que las genericas :id', () => {
    // Nest/Express registran en orden de declaracion: si ':id' va antes,
    // GET /teacher-assignments/course-directors cae en findOne con id='course-directors'
    // y ParseUUIDPipe lanza 'Validation failed (uuid is expected)'.
    const proto = TeacherAssignmentsController.prototype;
    const order = Object.getOwnPropertyNames(proto).filter((n) => n !== 'constructor');
    const idx = (n: string) => order.indexOf(n);
    expect(idx('findAllCourseDirectors')).toBeGreaterThanOrEqual(0);
    expect(idx('findOne')).toBeGreaterThanOrEqual(0);
    expect(idx('findAllCourseDirectors')).toBeLessThan(idx('findOne'));
    expect(idx('getCurrentDirector')).toBeLessThan(idx('findOneCourseDirector'));
    expect(idx('update')).toBeGreaterThan(idx('updateCourseDirector'));
    expect(idx('deactivate')).toBeGreaterThan(idx('deactivateCourseDirector'));
  });

  it('mantiene ParseUUIDPipe en :id (validacion estricta, sin relajar)', () => {
    const src = fs.readFileSync(path.join(__dirname, 'teacher-assignments.controller.ts'), 'utf8') as string;
    expect(src).toContain("@Param('id', ParseUUIDPipe)");
    expect(src).not.toContain('ParseUUIDPipe({ optional');
  });
});
