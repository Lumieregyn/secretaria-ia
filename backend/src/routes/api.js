import { Router } from 'express'
export const router = Router()
const db = { brands: [], reps: [], solic: [] }

router.get('/seed', (req,res)=> res.json(db))
router.post('/seed', (req,res)=> { const {brands=[],reps=[],solic=[]} = req.body||{}; db.brands=brands; db.reps=reps; db.solic=solic; res.json({ok:true}) })

router.get('/brands', (req,res)=> res.json(db.brands))
router.post('/brands', (req,res)=> { db.brands.unshift({ id: crypto.randomUUID(), ...req.body }); res.status(201).json({ ok:true }) })

router.get('/reps', (req,res)=> res.json(db.reps))
router.post('/reps', (req,res)=> { db.reps.unshift({ id: crypto.randomUUID(), ...req.body }); res.status(201).json({ ok:true }) })

router.get('/solic', (req,res)=> res.json(db.solic))
router.post('/solic', (req,res)=> { db.solic.unshift({ id: crypto.randomUUID(), ...req.body }); res.status(201).json({ ok:true }) })
