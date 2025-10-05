from django.urls import path
from . import views

app_name = 'pdfqa'

urlpatterns = [
    path('', views.index, name='index'),
    path('upload', views.upload_pdf, name='upload_pdf'),
    path('ask', views.ask_question, name='ask_question'),
    path('reset', views.reset_session, name='reset_session'),
]
