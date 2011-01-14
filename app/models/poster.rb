class Poster < ActiveRecord::Base
  has_many :widgets
  
  validates_uniqueness_of :url, case_sensitive: false
  
  def verify(secret)
    secret == self.secret
  end
end
