import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { h } from 'vue'
import './style.css'

import Figure from './components/Figure.vue'
import RunOutput from './components/RunOutput.vue'
import PresToggle from './components/PresToggle.vue'
import CourseHome from './components/CourseHome.vue'
import Materials from './components/Materials.vue'

import GradientDescentLab from './components/GradientDescentLab.vue'
import OutlierLab from './components/OutlierLab.vue'
import ThresholdLab from './components/ThresholdLab.vue'
import KMeansLab from './components/KMeansLab.vue'
import ActivationLab from './components/ActivationLab.vue'
import RegularizationLab from './components/RegularizationLab.vue'
import PCALab from './components/PCALab.vue'
import KnnLab from './components/KnnLab.vue'
import PreprocessLab from './components/PreprocessLab.vue'
import ConvolutionLab from './components/ConvolutionLab.vue'
import DbscanLab from './components/DbscanLab.vue'
import BiasVarianceLab from './components/BiasVarianceLab.vue'
import SplitLab from './components/SplitLab.vue'
import WordVectorLab from './components/WordVectorLab.vue'
import KernelLab from './components/KernelLab.vue'
import PositionalLab from './components/PositionalLab.vue'
import DiffusionLab from './components/DiffusionLab.vue'
import LikelihoodLab from './components/LikelihoodLab.vue'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'layout-bottom': () => h(PresToggle),
    })
  },
  enhanceApp({ app }) {
    app.component('Figure', Figure)
    app.component('RunOutput', RunOutput)
    app.component('CourseHome', CourseHome)
    app.component('Materials', Materials)
    app.component('GradientDescentLab', GradientDescentLab)
    app.component('OutlierLab', OutlierLab)
    app.component('ThresholdLab', ThresholdLab)
    app.component('KMeansLab', KMeansLab)
    app.component('ActivationLab', ActivationLab)
    app.component('RegularizationLab', RegularizationLab)
    app.component('PCALab', PCALab)
    app.component('KnnLab', KnnLab)
    app.component('PreprocessLab', PreprocessLab)
    app.component('ConvolutionLab', ConvolutionLab)
    app.component('DbscanLab', DbscanLab)
    app.component('BiasVarianceLab', BiasVarianceLab)
    app.component('SplitLab', SplitLab)
    app.component('WordVectorLab', WordVectorLab)
    app.component('KernelLab', KernelLab)
    app.component('PositionalLab', PositionalLab)
    app.component('DiffusionLab', DiffusionLab)
    app.component('LikelihoodLab', LikelihoodLab)
  },
} satisfies Theme
