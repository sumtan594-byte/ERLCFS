import bpy
import sys

source, destination = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=source)

for obj in list(bpy.data.objects):
    if obj.type != 'MESH':
        continue
    for face in obj.data.polygons:
        face.use_smooth = True
    if obj.name not in {'Wolf3D_Body', 'Wolf3D_Head'}:
        continue
    if obj.data.shape_keys:
        obj.shape_key_clear()
    bpy.context.view_layer.objects.active = obj
    modifier = obj.modifiers.new('Surface refinement', 'SUBSURF')
    modifier.subdivision_type = 'CATMULL_CLARK'
    modifier.levels = 2 if obj.name == 'Wolf3D_Body' else 1
    modifier.render_levels = modifier.levels
    while obj.modifiers.find(modifier.name) > 0:
        bpy.ops.object.modifier_move_up(modifier=modifier.name)
    bpy.ops.object.modifier_apply(modifier=modifier.name)

bpy.ops.export_scene.gltf(filepath=destination, export_format='GLB', export_animations=False, export_copyright='Ready Player Me; surface refinement for County Flight')
