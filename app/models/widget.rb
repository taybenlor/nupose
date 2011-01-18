class Widget < ActiveRecord::Base
  belongs_to :poster
  
  def verify(secret)
    self.poster.verify(secret)
  end
end
