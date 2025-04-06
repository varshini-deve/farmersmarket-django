from django.db import models
from django.utils.text import slugify 
from django.urls import reverse
# Create your models here.

class Category(models.Model): 
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField()
    image= models.ImageField(upload_to='images/products')
    
    class Meta:
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'
        
        
    def get_url(self):
            return reverse('products_by_category',args=[self.slug])  
              
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)  # Auto-generate slug from name
        super(Category, self).save(*args, **kwargs)
    
    def __str__(self):
        return self.name